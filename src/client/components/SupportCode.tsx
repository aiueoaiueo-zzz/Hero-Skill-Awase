import { copyText } from "../lib/ui";

export function SupportCodeButton({ code, big }: { code: string; big?: boolean }) {
  return (
    <button type="button" className={big ? "supc big" : "supc"} onClick={() => copyText(code, "応援コードをコピーしました")}>
      {big ? `${code}　📋` : `応援コード ${code}`}
    </button>
  );
}
