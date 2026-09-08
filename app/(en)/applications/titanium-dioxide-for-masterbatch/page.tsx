import "../../../../components/sites/tio2-my/editorial/app-mb.css";

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from "../../../../lib/editorial/malaysia-editorial-route";

const PAGE_ID = "APP-MB";

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID);
}

export default function Page() {
  return renderMalaysiaEditorialRoute(PAGE_ID);
}
