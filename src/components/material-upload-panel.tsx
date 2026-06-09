"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";

type Compliance = "safe" | "warning" | "blocked";

type UploadState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "success";
      compliance: Compliance;
      riskReason: string | null;
    }
  | { status: "error"; message: string };

type MaterialUploadResponse = {
  ok?: boolean;
  data?: {
    material?: {
      compliance?: unknown;
      riskReason?: string | null;
    };
  };
  error?: string;
};

const complianceLabel: Record<Compliance, string> = {
  safe: "通过",
  warning: "预警",
  blocked: "阻断"
};

function normalizeCompliance(value: unknown): Compliance {
  return value === "warning" || value === "blocked" ? value : "safe";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "上传失败，请稍后重试";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("图片预览读取失败"));
    };
    reader.onerror = () => reject(new Error("图片预览读取失败"));
    reader.readAsDataURL(file);
  });
}

export function MaterialUploadPanel() {
  const router = useRouter();
  const nameId = useId();
  const typeId = useId();
  const sizeId = useId();
  const fileId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("新素材.png");
  const [type, setType] = useState("image/png");
  const [size, setSize] = useState("120000");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });

  async function uploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const materialName = name.trim();
    const materialType = type.trim();
    const materialSize = Number(size);

    if (!materialName) {
      setUploadState({ status: "error", message: "请输入素材名称" });
      return;
    }

    if (!materialType) {
      setUploadState({ status: "error", message: "请输入文件类型" });
      return;
    }

    if (!Number.isInteger(materialSize) || materialSize <= 0) {
      setUploadState({ status: "error", message: "文件大小必须大于 0" });
      return;
    }

    setUploadState({ status: "submitting" });

    try {
      const materialUrl = previewUrl ?? (selectedFile ? await readFileAsDataUrl(selectedFile) : null);

      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: materialName,
          type: materialType,
          size: materialSize,
          url: materialUrl ?? undefined
        })
      });
      const payload = (await response.json()) as MaterialUploadResponse;

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "上传失败，请稍后重试");
      }

      const material = payload.data?.material ?? {};
      setUploadState({
        status: "success",
        compliance: normalizeCompliance(material.compliance),
        riskReason: material.riskReason ?? null
      });
      setIsOpen(false);
      setName("新素材.png");
      setType("image/png");
      setSize("120000");
      setSelectedFile(null);
      setPreviewUrl(null);
      router.refresh();
    } catch (error) {
      setUploadState({ status: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        aria-expanded={isOpen}
        className="studio-button h-10 w-full bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar sm:w-auto"
        onClick={() => {
          setIsOpen((current) => !current);
          setUploadState({ status: "idle" });
        }}
      >
        上传素材
      </button>

      {!isOpen && uploadState.status === "success" ? (
        <div className="pointer-events-none mt-3 rounded-md border border-teal/20 bg-teal/10 px-3 py-2 text-sm text-teal sm:absolute sm:right-0 sm:top-12 sm:z-20 sm:mt-0 sm:w-72">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">上传成功，素材已加入列表</span>
            <StatusBadge tone={uploadState.compliance}>
              {complianceLabel[uploadState.compliance]}
            </StatusBadge>
          </div>
          <p className="mt-1">合规状态：{complianceLabel[uploadState.compliance]}</p>
          {uploadState.riskReason ? (
            <p className="mt-1 text-muted">{uploadState.riskReason}</p>
          ) : null}
        </div>
      ) : null}

      {isOpen ? (
        <form
          onSubmit={uploadMaterial}
          className="mt-3 space-y-3 rounded-lg border border-line bg-panel p-4 shadow-crisp sm:absolute sm:right-0 sm:top-12 sm:z-30 sm:mt-0 sm:w-96"
        >
          <div>
            <label htmlFor={fileId} className="text-xs font-semibold text-muted">
              本地文件
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="studio-input mt-2 w-full px-3 py-2 text-sm"
              onChange={async (event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                setName(file.name);
                setType(file.type || "image/png");
                setSize(String(file.size || 1));
                setSelectedFile(file);
                setUploadState({ status: "idle" });

                try {
                  setPreviewUrl(await readFileAsDataUrl(file));
                } catch (error) {
                  setPreviewUrl(null);
                  setUploadState({ status: "error", message: getErrorMessage(error) });
                }
              }}
            />
          </div>

          {previewUrl ? (
            <div className="overflow-hidden rounded-md border border-line bg-panel-muted">
              <img src={previewUrl} alt="素材预览" className="h-36 w-full object-cover" />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <label htmlFor={nameId} className="text-xs font-semibold text-muted">
                素材名称
              </label>
              <input
                id={nameId}
                value={name}
                className="studio-input mt-2 h-10 w-full px-3 text-sm"
                onChange={(event) => {
                  setName(event.target.value);
                  setUploadState({ status: "idle" });
                }}
              />
            </div>
            <div>
              <label htmlFor={sizeId} className="text-xs font-semibold text-muted">
                文件大小
              </label>
              <input
                id={sizeId}
                type="number"
                min="1"
                value={size}
                className="studio-input mt-2 h-10 w-full px-3 text-sm"
                onChange={(event) => {
                  setSize(event.target.value);
                  setUploadState({ status: "idle" });
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor={typeId} className="text-xs font-semibold text-muted">
              文件类型
            </label>
            <select
              id={typeId}
              value={type}
              className="studio-input mt-2 h-10 w-full px-3 text-sm"
              onChange={(event) => {
                setType(event.target.value);
                setUploadState({ status: "idle" });
              }}
            >
              <option value="image/png">image/png</option>
              <option value="image/jpeg">image/jpeg</option>
              <option value="image/webp">image/webp</option>
              <option value="image/svg+xml">image/svg+xml</option>
            </select>
          </div>

          {uploadState.status === "success" ? (
            <div className="rounded-md border border-teal/20 bg-teal/10 px-3 py-2 text-sm text-teal">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">上传成功</span>
                <StatusBadge tone={uploadState.compliance}>
                  {complianceLabel[uploadState.compliance]}
                </StatusBadge>
              </div>
              <p className="mt-1">
                合规状态：{complianceLabel[uploadState.compliance]}
              </p>
              {uploadState.riskReason ? (
                <p className="mt-1 text-muted">{uploadState.riskReason}</p>
              ) : null}
            </div>
          ) : null}

          {uploadState.status === "error" ? (
            <p className="rounded-md border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
              {uploadState.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="studio-button h-9 border border-line bg-panel px-3 text-sm font-semibold text-ink hover:border-accent"
              onClick={() => setIsOpen(false)}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={uploadState.status === "submitting"}
              className="studio-button h-9 bg-sidebar px-3 text-sm font-semibold text-white shadow-crisp hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadState.status === "submitting" ? "上传中" : "确认上传"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
