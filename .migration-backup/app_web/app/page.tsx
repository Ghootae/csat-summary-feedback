import manifest from "@/data/paragraphs/manifest.json";
import DiagnoseForm from "@/components/diagnose-form";

export default function HomePage() {
  return <DiagnoseForm items={manifest} />;
}
