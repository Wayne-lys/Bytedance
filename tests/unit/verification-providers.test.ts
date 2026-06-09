import { describe, expect, it } from "vitest";
import {
  isVolcMailConfigured,
  isVolcSmsConfigured,
  resolveVolcMailConfig,
  resolveVolcSmsConfig,
  sendSmsVerificationCode
} from "@/features/verification/providers";

describe("verification delivery providers", () => {
  it("requires all Volc SMS fields before enabling real SMS delivery", () => {
    expect(isVolcSmsConfigured({})).toBe(false);
    expect(
      isVolcSmsConfigured({
        VOLC_ACCESSKEY: "ak",
        VOLC_SECRETKEY: "sk",
        VOLC_SMS_ACCOUNT: "account",
        VOLC_SMS_SIGN: "sign",
        VOLC_SMS_TEMPLATE_ID: "template"
      })
    ).toBe(true);
  });

  it("keeps SMS delivery mocked when SMS_DELIVERY_MODE is mock", () => {
    expect(
      isVolcSmsConfigured({
        SMS_DELIVERY_MODE: "mock",
        VOLC_ACCESSKEY: "ak",
        VOLC_SECRETKEY: "sk",
        VOLC_SMS_ACCOUNT: "account",
        VOLC_SMS_SIGN: "sign",
        VOLC_SMS_TEMPLATE_ID: "template"
      })
    ).toBe(false);
  });

  it("returns a debug SMS code in explicit mock mode even for production demos", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalMode = process.env.SMS_DELIVERY_MODE;
    const originalAccessKey = process.env.VOLC_ACCESSKEY;
    const originalSecretKey = process.env.VOLC_SECRETKEY;
    const originalSmsAccount = process.env.VOLC_SMS_ACCOUNT;
    const originalSmsSign = process.env.VOLC_SMS_SIGN;
    const originalTemplateId = process.env.VOLC_SMS_TEMPLATE_ID;

    process.env.NODE_ENV = "production";
    process.env.SMS_DELIVERY_MODE = "mock";
    process.env.VOLC_ACCESSKEY = "ak";
    process.env.VOLC_SECRETKEY = "sk";
    process.env.VOLC_SMS_ACCOUNT = "account";
    process.env.VOLC_SMS_SIGN = "sign";
    process.env.VOLC_SMS_TEMPLATE_ID = "template";

    try {
      await expect(
        sendSmsVerificationCode({ phone: "13900000000", code: "123456" })
      ).resolves.toEqual({ provider: "mock", debugCode: "123456" });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.SMS_DELIVERY_MODE = originalMode;
      process.env.VOLC_ACCESSKEY = originalAccessKey;
      process.env.VOLC_SECRETKEY = originalSecretKey;
      process.env.VOLC_SMS_ACCOUNT = originalSmsAccount;
      process.env.VOLC_SMS_SIGN = originalSmsSign;
      process.env.VOLC_SMS_TEMPLATE_ID = originalTemplateId;
    }
  });

  it("resolves SMS defaults for auth verification", () => {
    const config = resolveVolcSmsConfig({
      VOLC_ACCESSKEY: "ak",
      VOLC_SECRETKEY: "sk",
      VOLC_SMS_ACCOUNT: "account",
      VOLC_SMS_SIGN: "sign",
      VOLC_SMS_TEMPLATE_ID: "template"
    });

    expect(config.region).toBe("cn-north-1");
    expect(config.scene).toBe("auth");
    expect(config.codeType).toBe(6);
    expect(config.expireTime).toBe(300);
  });

  it("requires SMTP host, credentials, and sender before enabling real mail delivery", () => {
    expect(isVolcMailConfigured({ VOLC_EMAIL_SMTP_HOST: "smtp.example.com" })).toBe(false);
    expect(
      isVolcMailConfigured({
        VOLC_EMAIL_SMTP_HOST: "smtp.example.com",
        VOLC_EMAIL_SMTP_USER: "user",
        VOLC_EMAIL_SMTP_PASS: "pass",
        VOLC_EMAIL_FROM: "noreply@example.com"
      })
    ).toBe(true);
  });

  it("resolves mail defaults for secure SMTP", () => {
    const config = resolveVolcMailConfig({
      VOLC_EMAIL_SMTP_HOST: "smtp.example.com",
      VOLC_EMAIL_SMTP_USER: "user",
      VOLC_EMAIL_SMTP_PASS: "pass",
      VOLC_EMAIL_FROM: "noreply@example.com"
    });

    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
  });
});
