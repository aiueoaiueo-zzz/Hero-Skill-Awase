import { Header } from "../components/Header";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";
import { mdLite } from "../lib/ui";

/** 6'. このアプリについて */
export function About() {
  const { settings } = useData();
  useBootFx(true);
  return (
    <>
      <Header title="このアプリについて" back="/" prog={PROG.other} />
      <div className="about" dangerouslySetInnerHTML={{ __html: mdLite(settings.about) }} />
    </>
  );
}
