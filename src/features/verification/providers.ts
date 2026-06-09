import nodemailer from "nodemailer";
import crypto from "crypto";

type DeliveryResult = {
  provider: "mock" | "volc-sms" | "volc-mail-smtp";
  debugCode?: string;
};

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0);
}

function uriEscape(value: string) {
  return encodeURIComponent(value)
    .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
    .replace(/[*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function queryParamsToString(params: Record<string, string | number | undefined>) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined)
    .sort()
    .map((key) => `${uriEscape(key)}=${uriEscape(String(params[key]))}`)
    .join("&");
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key: crypto.BinaryLike | crypto.KeyObject, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: crypto.BinaryLike | crypto.KeyObject, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function volcDateTime(date = new Date()) {
  return date.toISOString().replace(/[:\-]|\.\d{3}/g, "");
}

function credentialScope(datetime: string, region: string, serviceName: string) {
  return [datetime.slice(0, 8), region, serviceName, "request"].join("/");
}

function signVolcRequest({
  accessKeyId,
  secretKey,
  sessionToken,
  region,
  serviceName,
  method,
  pathname,
  params,
  body
}: {
  accessKeyId: string;
  secretKey: string;
  sessionToken?: string;
  region: string;
  serviceName: string;
  method: string;
  pathname: string;
  params: Record<string, string>;
  body: string;
}) {
  const datetime = volcDateTime();
  const bodyHash = sha256(body);
  const headers: Record<string, string> = {
    "X-Date": datetime,
    "X-Content-Sha256": bodyHash
  };

  if (sessionToken) {
    headers["X-Security-Token"] = sessionToken;
  }

  const signedHeaders = Object.keys(headers)
    .map((key) => key.toLowerCase())
    .sort()
    .join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()))
    .map((key) => `${key.toLowerCase()}:${headers[key].replace(/\s+/g, " ").trim()}`)
    .join("\n");
  const canonicalRequest = [
    method.toUpperCase(),
    pathname,
    queryParamsToString(params),
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodyHash
  ].join("\n");
  const scope = credentialScope(datetime, region, serviceName);
  const stringToSign = [
    "HMAC-SHA256",
    datetime,
    scope,
    sha256(canonicalRequest)
  ].join("\n");
  const dateKey = hmac(secretKey, datetime.slice(0, 8));
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, serviceName);
  const signingKey = hmac(serviceKey, "request");
  const signature = hmacHex(signingKey, stringToSign);

  return {
    ...headers,
    Authorization: [
      `HMAC-SHA256 Credential=${accessKeyId}/${scope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`
    ].join(", ")
  };
}

type EnvLike = Record<string, string | undefined>;

function isMockDeliveryMode(value: string | undefined) {
  return value?.trim().toLowerCase() === "mock";
}

function forceTestMockDelivery(env: EnvLike) {
  return env === process.env && process.env.NODE_ENV === "test";
}

function forceSmsMockDelivery(env: EnvLike) {
  return (
    forceTestMockDelivery(env) ||
    isMockDeliveryMode(
      firstNonEmpty(
        env.SMS_DELIVERY_MODE,
        env.VERIFICATION_SMS_MODE,
        env.VERIFICATION_DELIVERY_MODE
      )
    )
  );
}

function forceMailMockDelivery(env: EnvLike) {
  return (
    forceTestMockDelivery(env) ||
    isMockDeliveryMode(
      firstNonEmpty(
        env.EMAIL_DELIVERY_MODE,
        env.VERIFICATION_EMAIL_MODE,
        env.VERIFICATION_DELIVERY_MODE
      )
    )
  );
}

function debugCode(code: string, exposeInProduction = false) {
  return process.env.NODE_ENV === "production" && !exposeInProduction
    ? undefined
    : code;
}

export function resolveVolcSmsConfig(env: EnvLike = process.env) {
  const accessKeyId = firstNonEmpty(
    env.VOLC_ACCESSKEY,
    env.VOLC_ACCESS_KEY_ID,
    env.VOLCENGINE_ACCESS_KEY_ID
  );
  const secretKey = firstNonEmpty(
    env.VOLC_SECRETKEY,
    env.VOLC_SECRET_ACCESS_KEY,
    env.VOLCENGINE_SECRET_ACCESS_KEY
  );
  const smsAccount = firstNonEmpty(env.VOLC_SMS_ACCOUNT);
  const sign = firstNonEmpty(env.VOLC_SMS_SIGN);
  const templateId = firstNonEmpty(env.VOLC_SMS_TEMPLATE_ID);

  return {
    accessKeyId,
    secretKey,
    smsAccount,
    sign,
    templateId,
    region: firstNonEmpty(env.VOLC_SMS_REGION) ?? "cn-north-1",
    sessionToken: firstNonEmpty(env.VOLC_SESSION_TOKEN),
    scene: firstNonEmpty(env.VOLC_SMS_SCENE) ?? "auth",
    tag: firstNonEmpty(env.VOLC_SMS_TAG) ?? "auth",
    codeType: Number(firstNonEmpty(env.VOLC_SMS_CODE_TYPE) ?? "6"),
    expireTime: Number(firstNonEmpty(env.VOLC_SMS_EXPIRE_SECONDS) ?? "300"),
    tryCount: Number(firstNonEmpty(env.VOLC_SMS_TRY_COUNT) ?? "5")
  };
}

export function isVolcSmsConfigured(env: EnvLike = process.env) {
  if (forceSmsMockDelivery(env)) {
    return false;
  }

  const config = resolveVolcSmsConfig(env);

  return Boolean(
    config.accessKeyId &&
      config.secretKey &&
      config.smsAccount &&
      config.sign &&
      config.templateId
  );
}

function assertVolcSuccess(response: {
  ResponseMetadata?: {
    Error?: { Message?: string; Code?: string };
    Code?: string;
    CodeN?: number;
    Message?: string;
  };
}) {
  const metadata = response.ResponseMetadata;
  const error =
    metadata?.Error ??
    (metadata?.Code && metadata.Code !== "Success"
      ? { Code: metadata.Code, Message: metadata.Message }
      : undefined) ??
    (typeof metadata?.CodeN === "number" && metadata.CodeN !== 0
      ? { Code: String(metadata.CodeN), Message: metadata.Message }
      : undefined);

  if (error) {
    throw new Error(error.Message ?? error.Code ?? "火山短信请求失败");
  }
}

async function requestVolcSms<T>({
  action,
  body
}: {
  action: "SendSmsVerifyCode" | "CheckSmsVerifyCode";
  body: Record<string, string | number>;
}) {
  const config = resolveVolcSmsConfig();
  const requestBody = JSON.stringify(body);
  const params = {
    Action: action,
    Version: "2020-01-01"
  };
  const headers = signVolcRequest({
    accessKeyId: config.accessKeyId ?? "",
    secretKey: config.secretKey ?? "",
    sessionToken: config.sessionToken,
    region: config.region,
    serviceName: "volcSMS",
    method: "POST",
    pathname: "/",
    params,
    body: requestBody
  });
  const response = await fetch(
    `https://sms.volcengineapi.com/?${queryParamsToString(params)}`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: requestBody
    }
  );
  const payload = (await response.json()) as T & {
    ResponseMetadata?: {
      Error?: { Message?: string; Code?: string };
      Code?: string;
      CodeN?: number;
      Message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(
      payload.ResponseMetadata?.Error?.Message ??
        payload.ResponseMetadata?.Message ??
        `火山短信请求失败：HTTP ${response.status}`
    );
  }

  assertVolcSuccess(payload);

  return payload;
}

export async function sendSmsVerificationCode({
  phone,
  code
}: {
  phone: string;
  code: string;
}): Promise<DeliveryResult> {
  const config = resolveVolcSmsConfig();

  if (!isVolcSmsConfigured()) {
    return {
      provider: "mock",
      debugCode: debugCode(code, forceSmsMockDelivery(process.env))
    };
  }

  await requestVolcSms({
    action: "SendSmsVerifyCode",
    body: {
    SmsAccount: config.smsAccount ?? "",
    Sign: config.sign ?? "",
    TemplateID: config.templateId ?? "",
    PhoneNumber: phone,
    Tag: config.tag,
    UserExtCode: "",
    Scene: config.scene,
    CodeType: config.codeType,
    ExpireTime: config.expireTime,
    TryCount: config.tryCount
    }
  });

  return { provider: "volc-sms" };
}

export async function checkSmsVerificationCode({
  phone,
  code
}: {
  phone: string;
  code: string;
}) {
  const config = resolveVolcSmsConfig();

  if (!isVolcSmsConfigured()) {
    return false;
  }

  const response = await requestVolcSms<{ Result?: string }>({
    action: "CheckSmsVerifyCode",
    body: {
      SmsAccount: config.smsAccount ?? "",
      PhoneNumber: phone,
      Scene: config.scene,
      Code: code
    }
  });

  return String(response.Result ?? "true").toLowerCase() !== "false";
}

export function resolveVolcMailConfig(env: EnvLike = process.env) {
  const host = firstNonEmpty(env.VOLC_EMAIL_SMTP_HOST, env.SMTP_HOST);
  const user = firstNonEmpty(env.VOLC_EMAIL_SMTP_USER, env.SMTP_USER);
  const pass = firstNonEmpty(env.VOLC_EMAIL_SMTP_PASS, env.SMTP_PASS);
  const from = firstNonEmpty(env.VOLC_EMAIL_FROM, env.SMTP_FROM);
  const port = Number(firstNonEmpty(env.VOLC_EMAIL_SMTP_PORT, env.SMTP_PORT) ?? "465");

  return {
    host,
    port,
    secure: firstNonEmpty(env.VOLC_EMAIL_SMTP_SECURE, env.SMTP_SECURE) !== "false",
    user,
    pass,
    from
  };
}

export function isVolcMailConfigured(env: EnvLike = process.env) {
  if (forceMailMockDelivery(env)) {
    return false;
  }

  const config = resolveVolcMailConfig(env);

  return Boolean(config.host && config.user && config.pass && config.from);
}

export async function sendEmailVerificationCode({
  email,
  code
}: {
  email: string;
  code: string;
}): Promise<DeliveryResult> {
  const config = resolveVolcMailConfig();

  if (!isVolcMailConfigured()) {
    return {
      provider: "mock",
      debugCode: debugCode(code, forceMailMockDelivery(process.env))
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: "Toutiao Studio 注册验证码",
    text: `你的注册验证码是 ${code}，5 分钟内有效。请勿转发给他人。`,
    html: `<p>你的注册验证码是 <strong>${code}</strong>，5 分钟内有效。</p><p>请勿转发给他人。</p>`
  });

  return { provider: "volc-mail-smtp" };
}
