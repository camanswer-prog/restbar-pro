// RESTBAR PRO — Moteur Cryptographique de Gestion des Licences PRO
import { License, LicensePlanType } from '../types/database';

const LICENSE_SALT = 'RESTBAR_PRO_ENTERPRISE_HMAC_SECRET_V1';

/**
 * Calcule un hachage SHA-256 synchrone/asynchrone standard
 */
export async function computeHmacSha256(message: string, secretKey: string = LICENSE_SALT): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(message);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback simple pour environnements sans WebCrypto
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

/**
 * Génère une clé de licence formatée pour l'établissement
 */
export function generateLicenseKey(plan: LicensePlanType): string {
  const prefix = `RBP-${plan.toUpperCase()}`;
  const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${segment()}-${segment()}-${segment()}-${segment()}`;
}

export interface LicenseGenerationParams {
  establishmentId: string;
  planType: LicensePlanType;
  durationMonths?: number;
  startsAt?: string;
  expiresAt?: string;
  status?: 'active' | 'en_attente' | 'suspendue' | 'expiree';
  maxUsers?: number;
  maxRegisters?: number;
  customFeatures?: Record<string, boolean>;
}

/**
 * Crée une entité de licence complète avec signature cryptographique
 */
export async function createSignedLicense(params: LicenseGenerationParams): Promise<License> {
  const key = generateLicenseKey(params.planType);
  const startsAt = params.startsAt || new Date().toISOString();

  let expiresAt = params.expiresAt;
  if (!expiresAt) {
    const expires = new Date(startsAt);
    expires.setMonth(expires.getMonth() + (params.durationMonths || 12));
    expiresAt = expires.toISOString();
  }

  let maxUsers = 5;
  let maxRegisters = 1;
  const features = {
    kds: true,
    multi_tills: false,
    advanced_reports: false,
    inventory: false,
    reservations: false,
    ...params.customFeatures,
  };

  if (params.planType === 'pro') {
    maxUsers = 15;
    maxRegisters = 4;
    features.multi_tills = true;
    features.advanced_reports = true;
    features.reservations = true;
  } else if (params.planType === 'enterprise') {
    maxUsers = 100;
    maxRegisters = 20;
    features.multi_tills = true;
    features.advanced_reports = true;
    features.inventory = true;
    features.reservations = true;
  }

  if (params.maxUsers) maxUsers = params.maxUsers;
  if (params.maxRegisters) maxRegisters = params.maxRegisters;

  const payload = `${params.establishmentId}|${key}|${params.planType}|${expiresAt}|${maxUsers}|${maxRegisters}`;
  const signature = await computeHmacSha256(payload);

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lic_${Date.now()}`,
    establishment_id: params.establishmentId,
    license_key: key,
    plan_type: params.planType,
    status: params.status || 'active',
    max_users: maxUsers,
    max_registers: maxRegisters,
    starts_at: startsAt,
    expires_at: expiresAt,
    features,
    signature,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Valide l'authenticité d'une licence et sa date d'expiration
 */
export async function verifyLicense(
  license: License,
  targetEstablishmentId?: string
): Promise<{
  valid: boolean;
  reason?: string;
  daysRemaining?: number;
  isSuspended?: boolean;
  isExpired?: boolean;
  isPending?: boolean;
}> {
  if (targetEstablishmentId && license.establishment_id !== targetEstablishmentId) {
    return {
      valid: false,
      reason: `Violation RLS : Cette clé de licence est assignée à un autre établissement (${license.establishment_id}).`,
    };
  }

  if (license.status === 'suspendue') {
    return {
      valid: false,
      isSuspended: true,
      reason: 'Licence temporairement suspendue par l’administration Super Admin. Opérations bloquées.',
    };
  }

  if (license.status === 'en_attente') {
    return {
      valid: false,
      isPending: true,
      reason: 'Licence en attente d’activation officielle.',
    };
  }

  if (license.status === 'revoked') {
    return { valid: false, reason: 'Licence révoquée par le Super Administrateur.' };
  }

  const now = new Date();
  const expires = new Date(license.expires_at);

  if (expires < now || license.status === 'expiree' || license.status === 'expired') {
    return {
      valid: false,
      isExpired: true,
      reason: 'Licence arrivée à expiration. Renouvellement requis auprès du Super Admin.',
    };
  }

  const payload = `${license.establishment_id}|${license.license_key}|${license.plan_type}|${license.expires_at}|${license.max_users}|${license.max_registers}`;
  const expectedSignature = await computeHmacSha256(payload);

  if (license.signature !== expectedSignature) {
    return { valid: false, reason: 'Signature cryptographique invalide (altération de clé détectée).' };
  }

  const diffTime = expires.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    valid: true,
    daysRemaining,
  };
}
