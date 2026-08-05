import { describe, it, expect } from 'vitest';
import { redactObject, redactString, redactUrl, beforeSendRedactor } from '../src/lib/observability/sentry-redaction';

describe('sentry redaction', () => {
  it('scrubs deny-listed keys at any depth', () => {
    const input = {
      password: 'hunter2',
      nested: { access_token: 'abc', ok: 'keep' },
      list: [{ cpf: '123.456.789-00' }]
    };
    const out = redactObject(input);
    expect(out.password).toBe('***');
    expect((out.nested as Record<string, unknown>).access_token).toBe('***');
    expect((out.nested as Record<string, unknown>).ok).toBe('keep');
    expect(((out.list as Array<Record<string, unknown>>)[0]).cpf).toBe('***');
  });

  it('masks CPFs in free text', () => {
    expect(redactString('CPF do paciente 529.982.247-25 confirmado')).toBe(
      'CPF do paciente ***.***.***-** confirmado'
    );
    expect(redactString('CPF 52998224725 sem pontuacao')).toBe(
      'CPF ***.***.***-** sem pontuacao'
    );
  });

  it('masks email local part', () => {
    expect(redactString('Contato: joao.silva@example.com')).toContain('j***@example.com');
  });

  it('strips sensitive query params in URL', () => {
    expect(redactUrl('https://app.example.com/x?token=abc&keep=1')).toContain('token=***');
    expect(redactUrl('https://app.example.com/x?refresh_token=xyz')).toContain('refresh_token=***');
  });

  it('beforeSendRedactor scrubs request, user, extra', () => {
    const event = {
      request: {
        url: 'https://app.example.com/?token=SECRET',
        headers: { authorization: 'Bearer xyz', 'user-agent': 'k' },
        cookies: 'sid=abc',
        data: { password: 'p', clinical_description: 'diag' }
      },
      user: { id: 'u1', email: 'foo@bar.com', ip_address: '1.2.3.4' },
      extra: { patient_name: 'John', ok: 'yes' },
      breadcrumbs: [{ category: 'log', message: 'cpf 529.982.247-25 seen', data: { cpf: '1' } }],
      message: 'ok'
    };
    const out = beforeSendRedactor(event as unknown as Record<string, unknown>) as typeof event;
    expect(out.request.url).toContain('token=***');
    expect(out.request.headers.authorization).toBe('***');
    expect(out.request.cookies).toBe('***');
    expect((out.request.data as Record<string, unknown>).password).toBe('***');
    expect((out.request.data as Record<string, unknown>).clinical_description).toBe('***');
    expect(out.user.email).toContain('f***@');
    expect('ip_address' in out.user).toBe(false);
    expect((out.extra as Record<string, unknown>).patient_name).toBe('***');
    expect((out.extra as Record<string, unknown>).ok).toBe('yes');
    expect(out.breadcrumbs[0].message).toContain('***.***.***-**');
    expect((out.breadcrumbs[0].data as Record<string, unknown>).cpf).toBe('***');
  });
});
