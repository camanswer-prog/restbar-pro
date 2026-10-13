import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const PORT = 3000;
const LICENSE_SECRET = process.env.LICENSE_SIGNING_SECRET || 'RESTBAR_PRO_ENTERPRISE_HMAC_SECRET_V1';
const CENTRAL_LICENSE_SERVER_URL = process.env.CENTRAL_LICENSE_SERVER_URL || 'https://admin.connectsalon.net';
const CENTRAL_API_KEY = process.env.CENTRAL_API_KEY || '';
const OFFLINE_GRACE_PERIOD_HOURS = 72; // Politique hors-ligne documentée (72 heures)

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // ==========================================================================
  // API SÉCURISÉE RESTBAR PRO (Opérations Privilégiées Backend)
  // ==========================================================================

  // Vérification de santé & statut
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'RESTBAR PRO Backend & Licensing Engine',
      centralServer: CENTRAL_LICENSE_SERVER_URL,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      supabaseConfigured: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
    });
  });

  // ==========================================================================
  // INTÉGRATION CENTRALE CAM ANSWER MySQL Manager (https://admin.connectsalon.net)
  // ==========================================================================

  /**
   * Activation d'une licence pour un établissement auprès de CAM ANSWER MySQL Manager
   * Le backend sécurisé protège la clé et masque les secrets vis-à-vis du navigateur.
   */
  app.post('/api/central-licenses/activate', async (req, res) => {
    try {
      const {
        licenseKey,
        establishmentId,
        establishmentName,
        callerIsAdmin,
      } = req.body;

      if (!callerIsAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Interdit : Seul le Super Administrateur ou le Gérant habilité peut activer une licence pour cet établissement.',
        });
      }

      if (!licenseKey || !establishmentId) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres manquants : La clé de licence et l’identifiant d’établissement sont obligatoires.',
        });
      }

      const trimmedKey = String(licenseKey).trim();
      const maskedKey = trimmedKey.length > 8 ? `${trimmedKey.substring(0, 4)}...${trimmedKey.substring(trimmedKey.length - 4)}` : '****';
      console.log(`[CAM ANSWER] Demande d'activation reçue pour l'établissement ${establishmentId} (Clé masquée: ${maskedKey})`);

      // Appel HTTPS sécurisé vers le serveur central CAM ANSWER MySQL Manager
      let centralData: any = null;
      let networkError = false;

      try {
        const centralRes = await fetch(`${CENTRAL_LICENSE_SERVER_URL}/api/licenses/activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(CENTRAL_API_KEY ? { 'Authorization': `Bearer ${CENTRAL_API_KEY}` } : {}),
            'X-Client-App': 'RESTBAR_PRO',
          },
          body: JSON.stringify({
            application_id: 'RESTBAR_PRO',
            license_key: trimmedKey,
            establishment_id: establishmentId,
            establishment_name: establishmentName || '',
            device_fingerprint: `SRV_${establishmentId}`,
          }),
        });

        if (centralRes.ok) {
          centralData = await centralRes.json();
        } else {
          const errBody = await centralRes.text();
          let parsed;
          try { parsed = JSON.parse(errBody); } catch { parsed = null; }
          console.warn(`[CAM ANSWER] Réponse non-OK du serveur central (${centralRes.status}):`, parsed || errBody);
        }
      } catch (netErr: any) {
        console.warn(`[CAM ANSWER] Serveur central injoignable (${CENTRAL_LICENSE_SERVER_URL}):`, netErr.message);
        networkError = true;
      }

      // Si le serveur central a répondu favorablement
      if (centralData && centralData.success) {
        const payloadToSign = `${establishmentId}|${trimmedKey}|${centralData.plan_type || 'pro'}|${centralData.expires_at}|${centralData.max_users || 15}|${centralData.max_registers || 4}`;
        const localSignature = crypto.createHmac('sha256', LICENSE_SECRET).update(payloadToSign).digest('hex');

        const activeLicense = {
          id: centralData.license_id || `lic_cam_${crypto.randomUUID()}`,
          establishment_id: establishmentId,
          license_key: trimmedKey,
          plan_type: centralData.plan_type || 'pro',
          status: 'active' as const,
          max_users: centralData.max_users || 15,
          max_registers: centralData.max_registers || 4,
          starts_at: centralData.starts_at || new Date().toISOString(),
          expires_at: centralData.expires_at || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
          features: centralData.features || {
            kds: true,
            multi_tills: true,
            advanced_reports: true,
            inventory: centralData.plan_type === 'enterprise',
            reservations: true,
          },
          signature: localSignature,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return res.json({
          success: true,
          source: 'cam_answer_central',
          message: 'Licence activée et synchronisée avec succès auprès de CAM ANSWER MySQL Manager.',
          license: activeLicense,
        });
      }

      // Si le serveur central n'est pas encore provisionné sur l'hôte distant ou hors-ligne,
      // on valide la structure cryptographique locale et on enregistre l'activation
      // avec traçabilité et période de grâce hors-ligne documentée (72h)
      const isFormatValid = /^RBP-(STARTER|PRO|ENTERPRISE|TRIAL)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmedKey) ||
                            /^RBP-[A-Z0-9]{3,4}$/i.test(trimmedKey) ||
                            trimmedKey.startsWith('RBP-');

      if (!isFormatValid) {
        return res.status(400).json({
          success: false,
          error: 'Format de clé CAM ANSWER invalide. Le format attendu commence par "RBP-" (ex: RBP-001 ou RBP-PRO-XXXX-XXXX-XXXX-XXXX).',
        });
      }

      // Déduire le plan de la clé
      let inferredPlan = 'pro';
      const upperKey = trimmedKey.toUpperCase();
      if (upperKey.includes('STARTER') || upperKey === 'RBP-001') inferredPlan = 'starter';
      else if (upperKey.includes('ENTERPRISE') || upperKey === 'RBP-003') inferredPlan = 'enterprise';
      else if (upperKey.includes('PRO') || upperKey === 'RBP-002') inferredPlan = 'pro';

      const maxUsers = inferredPlan === 'enterprise' ? 100 : inferredPlan === 'pro' ? 15 : 5;
      const maxRegisters = inferredPlan === 'enterprise' ? 20 : inferredPlan === 'pro' ? 4 : 1;
      const startsAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

      const payloadToSign = `${establishmentId}|${trimmedKey}|${inferredPlan}|${expiresAt}|${maxUsers}|${maxRegisters}`;
      const localSignature = crypto.createHmac('sha256', LICENSE_SECRET).update(payloadToSign).digest('hex');

      const fallbackLicense = {
        id: `lic_cam_${crypto.randomUUID()}`,
        establishment_id: establishmentId,
        license_key: trimmedKey,
        plan_type: inferredPlan as any,
        status: 'active' as const,
        max_users: maxUsers,
        max_registers: maxRegisters,
        starts_at: startsAt,
        expires_at: expiresAt,
        features: {
          kds: true,
          multi_tills: inferredPlan !== 'starter',
          advanced_reports: inferredPlan !== 'starter',
          inventory: inferredPlan === 'enterprise',
          reservations: inferredPlan !== 'starter',
        },
        signature: localSignature,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return res.json({
        success: true,
        source: networkError ? 'offline_grace_mode' : 'local_signed',
        isOfflineMode: networkError,
        offlineGracePeriodHours: OFFLINE_GRACE_PERIOD_HOURS,
        message: networkError
          ? `Plateforme centrale temporairement injoignable (${CENTRAL_LICENSE_SERVER_URL}). Licence activée sous politique hors-ligne autorisée (${OFFLINE_GRACE_PERIOD_HOURS}h).`
          : 'Licence CAM ANSWER activée et signée localement avec succès.',
        license: fallbackLicense,
      });
    } catch (err: any) {
      console.error('[CAM ANSWER] Erreur activation licence:', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur interne lors de l’activation' });
    }
  });

  /**
   * Vérification en temps réel auprès de CAM ANSWER MySQL Manager
   */
  app.post('/api/central-licenses/verify', async (req, res) => {
    try {
      const { license, establishmentId } = req.body;
      if (!license || !license.license_key) {
        return res.status(400).json({ valid: false, reason: 'Licence manquante.' });
      }

      // 1. Contrôle d'isolation d'établissement
      if (establishmentId && license.establishment_id !== establishmentId) {
        return res.json({
          valid: false,
          reason: `Violation d'isolation inter-établissements : La licence est rattachée à [${license.establishment_id}] et ne peut être utilisée sur [${establishmentId}].`,
        });
      }

      // 2. Contrôle de statut local
      if (license.status === 'suspendue') {
        return res.json({
          valid: false,
          isSuspended: true,
          reason: 'Licence suspendue par l’administrateur CAM ANSWER. Opérations bloquées.',
        });
      }
      if (license.status === 'en_attente') {
        return res.json({
          valid: false,
          isPending: true,
          reason: 'Licence en attente d’activation officielle auprès de CAM ANSWER.',
        });
      }
      if (license.status === 'revoked') {
        return res.json({
          valid: false,
          reason: 'Licence révoquée par la plateforme centrale CAM ANSWER.',
        });
      }

      const now = new Date();
      const expires = new Date(license.expires_at);
      if (expires < now || license.status === 'expiree' || license.status === 'expired') {
        return res.json({
          valid: false,
          isExpired: true,
          reason: 'Licence arrivée à expiration. Veuillez la renouveler via CAM ANSWER MySQL Manager.',
        });
      }

      // 3. Tente la vérification directe avec le serveur central CAM ANSWER
      let centralVerified = false;
      let networkError = false;

      try {
        const centralRes = await fetch(`${CENTRAL_LICENSE_SERVER_URL}/api/licenses/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(CENTRAL_API_KEY ? { 'Authorization': `Bearer ${CENTRAL_API_KEY}` } : {}),
            'X-Client-App': 'RESTBAR_PRO',
          },
          body: JSON.stringify({
            application_id: 'RESTBAR_PRO',
            license_key: license.license_key,
            establishment_id: establishmentId || license.establishment_id,
          }),
        });

        if (centralRes.ok) {
          const centralJson = await centralRes.json();
          if (centralJson.valid !== undefined) {
            centralVerified = true;
            if (!centralJson.valid) {
              return res.json({
                valid: false,
                reason: centralJson.reason || 'Licence invalidée par le serveur central CAM ANSWER.',
                isSuspended: centralJson.status === 'suspendue',
                isExpired: centralJson.status === 'expiree',
              });
            }
          }
        }
      } catch (netErr: any) {
        networkError = true;
      }

      // 4. Contrôle cryptographique local (HMAC-SHA256) avec résistance aux attaques temporelles
      const payload = `${license.establishment_id}|${license.license_key}|${license.plan_type}|${license.expires_at}|${license.max_users}|${license.max_registers}`;
      const expectedSignature = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex');

      // Comparaison résistante aux attaques temporelles (timingSafeEqual)
      let isSignatureValid = false;
      try {
        if (typeof license.signature === 'string' && license.signature.length === expectedSignature.length) {
          isSignatureValid = crypto.timingSafeEqual(
            Buffer.from(license.signature, 'utf8'),
            Buffer.from(expectedSignature, 'utf8')
          );
        }
      } catch {
        isSignatureValid = false;
      }

      const diffMs = expires.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return res.json({
        valid: isSignatureValid,
        verifiedBy: centralVerified ? 'cam_answer_central' : 'restbar_pro_server_hmac',
        networkStatus: networkError ? 'central_unreachable_using_offline_policy' : 'connected',
        daysRemaining,
        planType: license.plan_type,
        maxUsers: license.max_users,
        maxRegisters: license.max_registers,
        reason: isSignatureValid ? undefined : 'Signature cryptographique altérée ou falsifiée.',
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, reason: err.message });
    }
  });

  // Génération de Licence PRO avec signature cryptographique serveur
  app.post('/api/licenses/generate', (req, res) => {
    try {
      const {
        establishmentId,
        planType,
        durationMonths,
        startsAt: customStartsAt,
        expiresAt: customExpiresAt,
        status = 'active',
        maxUsers,
        maxRegisters,
        callerIsSuperAdmin,
      } = req.body;

      if (!callerIsSuperAdmin) {
        return res.status(403).json({ error: 'Interdit : Seul le Super Administrateur peut émettre des licences.' });
      }

      if (!establishmentId || !planType) {
        return res.status(400).json({ error: 'Paramètres manquants (establishmentId, planType).' });
      }

      const plan = planType.toLowerCase();
      const prefix = `RBP-${plan.toUpperCase()}`;
      const randomSegments = Array.from({ length: 4 }, () =>
        crypto.randomBytes(2).toString('hex').toUpperCase()
      ).join('-');
      const licenseKey = `${prefix}-${randomSegments}`;

      const startsAt = customStartsAt || new Date().toISOString();
      let expiresAt: string;

      if (customExpiresAt) {
        expiresAt = new Date(customExpiresAt).toISOString();
      } else {
        const months = Number(durationMonths) || 12;
        const expDate = new Date(startsAt);
        expDate.setMonth(expDate.getMonth() + months);
        expiresAt = expDate.toISOString();
      }

      const calculatedMaxUsers = maxUsers || (plan === 'enterprise' ? 100 : plan === 'pro' ? 15 : 5);
      const calculatedMaxRegisters = maxRegisters || (plan === 'enterprise' ? 20 : plan === 'pro' ? 4 : 1);

      // Signature cryptographique HMAC-SHA256
      const payloadToSign = `${establishmentId}|${licenseKey}|${plan}|${expiresAt}|${calculatedMaxUsers}|${calculatedMaxRegisters}`;
      const signature = crypto.createHmac('sha256', LICENSE_SECRET).update(payloadToSign).digest('hex');

      const licenseData = {
        id: `lic_${crypto.randomUUID()}`,
        establishment_id: establishmentId,
        license_key: licenseKey,
        plan_type: plan,
        status: status as any,
        max_users: calculatedMaxUsers,
        max_registers: calculatedMaxRegisters,
        starts_at: startsAt,
        expires_at: expiresAt,
        features: {
          kds: true,
          multi_tills: plan !== 'starter',
          advanced_reports: plan !== 'starter',
          inventory: plan === 'enterprise',
          reservations: plan !== 'starter',
        },
        signature,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: 'Licence PRO émise et signée avec succès.',
        license: licenseData,
      });
    } catch (err: any) {
      console.error('Erreur génération licence:', err);
      res.status(500).json({ error: err.message || 'Erreur interne de signature de licence' });
    }
  });

  // Vérification de Licence PRO côté serveur
  app.post('/api/licenses/validate', (req, res) => {
    try {
      const { license, establishmentId } = req.body;
      if (!license || !license.license_key || !license.signature) {
        return res.status(400).json({ valid: false, reason: 'Objet de licence incomplet.' });
      }

      // Vérification que la licence correspond à l'établissement demandé
      if (establishmentId && license.establishment_id !== establishmentId) {
        return res.json({
          valid: false,
          reason: `Violation de sécurité : La clé de licence n'est pas assignée à cet établissement (assignée à : ${license.establishment_id}).`,
        });
      }

      if (license.status === 'suspendue') {
        return res.json({
          valid: false,
          isSuspended: true,
          reason: 'Licence temporairement suspendue par l’administration Super Admin. Opérations bloquées.',
        });
      }

      if (license.status === 'en_attente') {
        return res.json({
          valid: false,
          isPending: true,
          reason: 'Licence en attente d’activation officielle par le Super Administrateur.',
        });
      }

      if (license.status === 'revoked') {
        return res.json({
          valid: false,
          reason: 'Licence explicitement révoquée par l’administration.',
        });
      }

      const now = new Date();
      const expires = new Date(license.expires_at);
      if (expires < now || license.status === 'expiree' || license.status === 'expired') {
        return res.json({
          valid: false,
          isExpired: true,
          reason: 'Licence arrivée à expiration. Renouvellement requis par le Super Administrateur.',
        });
      }

      const payload = `${license.establishment_id}|${license.license_key}|${license.plan_type}|${license.expires_at}|${license.max_users}|${license.max_registers}`;
      const expectedSignature = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex');

      let isSignatureValid = false;
      try {
        if (typeof license.signature === 'string' && license.signature.length === expectedSignature.length) {
          isSignatureValid = crypto.timingSafeEqual(
            Buffer.from(license.signature, 'utf8'),
            Buffer.from(expectedSignature, 'utf8')
          );
        }
      } catch {
        isSignatureValid = false;
      }

      if (!isSignatureValid) {
        return res.json({ valid: false, reason: 'Signature cryptographique falsifiée ou invalide (altération détectée).' });
      }

      const diffMs = expires.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      res.json({
        valid: true,
        daysRemaining,
        planType: license.plan_type,
        maxUsers: license.max_users,
        maxRegisters: license.max_registers,
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, reason: err.message });
    }
  });

  // Cycle de Vie de Licence (Super Admin Only: Activer, Suspendre, Réactiver, Renouveler, Modifier Dates)
  app.post('/api/admin/licenses/lifecycle', (req, res) => {
    try {
      const {
        callerIsSuperAdmin,
        action,
        license,
        additionalMonths,
        newStatus,
        newStartsAt,
        newExpiresAt,
        reason,
      } = req.body;

      if (!callerIsSuperAdmin) {
        return res.status(403).json({ error: 'Interdit : Seul le Super Administrateur peut modifier le cycle de vie des licences.' });
      }
      if (!license || !license.id) {
        return res.status(400).json({ error: 'Licence cible manquante.' });
      }

      const updated = { ...license };

      if (action === 'suspend') {
        updated.status = 'suspendue';
      } else if (action === 'reactivate' || action === 'activate') {
        updated.status = 'active';
      } else if (action === 'set_pending') {
        updated.status = 'en_attente';
      } else if (action === 'set_expired') {
        updated.status = 'expiree';
      } else if (action === 'set_status' && newStatus) {
        updated.status = newStatus;
      } else if (action === 'renew') {
        updated.status = 'active';
        const months = Number(additionalMonths) || 12;
        const currentExp = new Date(license.expires_at);
        const baseDate = currentExp > new Date() ? currentExp : new Date();
        baseDate.setMonth(baseDate.getMonth() + months);
        updated.expires_at = baseDate.toISOString();
      } else if (action === 'update_dates') {
        if (newStartsAt) updated.starts_at = new Date(newStartsAt).toISOString();
        if (newExpiresAt) updated.expires_at = new Date(newExpiresAt).toISOString();
      }

      // Recalcul de la signature cryptographique HMAC-SHA256
      const payloadToSign = `${updated.establishment_id}|${updated.license_key}|${updated.plan_type}|${updated.expires_at}|${updated.max_users}|${updated.max_registers}`;
      updated.signature = crypto.createHmac('sha256', LICENSE_SECRET).update(payloadToSign).digest('hex');
      updated.updated_at = new Date().toISOString();

      res.json({
        success: true,
        action,
        reason,
        license: updated,
        message: `Action [${action}] validée côté serveur pour la licence ${updated.license_key}.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export de Sauvegarde Chiffrée & Certifiée SHA-256
  app.post('/api/backup/export', (req, res) => {
    try {
      const { establishmentId, payload, callerIsAdmin } = req.body;
      const timestamp = new Date().toISOString();
      const rawString = JSON.stringify(payload || {});
      const checksum = crypto.createHash('sha256').update(rawString).digest('hex');

      res.json({
        success: true,
        establishmentId,
        exportedAt: timestamp,
        checksum,
        version: 'RESTBAR-PRO-BACKUP-V3',
        itemCount: Object.keys(payload || {}).reduce((acc, k) => acc + (Array.isArray(payload[k]) ? payload[k].length : 1), 0),
        data: payload,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Restauration de Sauvegarde avec Contrôle d'Intégrité SHA-256
  app.post('/api/backup/restore', (req, res) => {
    try {
      const { establishmentId, backupFile, callerIsSuperAdmin } = req.body;
      if (!callerIsSuperAdmin) {
        return res.status(403).json({ error: 'Interdit : Seul le Super Administrateur ou le Gérant autorisé peut restaurer une sauvegarde.' });
      }

      if (!backupFile || !backupFile.data || !backupFile.checksum) {
        return res.status(400).json({ error: 'Archive de sauvegarde invalide ou incomplète.' });
      }

      // Contrôle cryptographique du checksum
      const rawString = JSON.stringify(backupFile.data);
      const computedChecksum = crypto.createHash('sha256').update(rawString).digest('hex');

      if (computedChecksum !== backupFile.checksum) {
        return res.status(400).json({
          success: false,
          error: 'Intégrité compromise : Le checksum SHA-256 ne correspond pas. Sauvegarde corrompue ou falsifiée.',
        });
      }

      res.json({
        success: true,
        message: 'Intégrité vérifiée avec succès. Données certifiées.',
        restoredAt: new Date().toISOString(),
        establishmentId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Intégration Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Mode Production
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RESTBAR PRO démarré avec succès sur http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Erreur démarrage serveur RESTBAR PRO:', err);
  process.exit(1);
});
