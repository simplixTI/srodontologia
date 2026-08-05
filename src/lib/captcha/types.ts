/**
 * CAPTCHA provider abstraction.
 *
 * Every provider (Cloudflare Turnstile, hCaptcha, reCAPTCHA v3) implements
 * this shape. Business code depends ONLY on this + `verifyCaptcha()` from
 * `./verify.ts`.
 */

export type CaptchaVerifyRequest = {
  token: string;
  remoteIp?: string | null;
  expectedAction?: string;   // for reCAPTCHA v3 (optional)
};

export type CaptchaVerifyResult = {
  ok: boolean;
  provider: string;
  errorCodes?: string[];
  hostname?: string;
  score?: number;            // reCAPTCHA v3
  reason?: string;
};

export type CaptchaProvider = {
  id: 'turnstile' | 'hcaptcha' | 'recaptcha' | 'mock';
  displayName: string;
  siteKey: string;                                     // client-safe, injected in forms
  verify(req: CaptchaVerifyRequest): Promise<CaptchaVerifyResult>;
};

export type CaptchaContext = 'signup' | 'forgot_password' | 'contact' | 'login_retry';
