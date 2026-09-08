import "../../../../components/sites/tio2-my/editorial/app-paper.css";

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from "../../../../lib/editorial/malaysia-editorial-route";

const PAGE_ID = "APP-PAPER";

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID);
}

export default function Page() {
  return renderMalaysiaEditorialRoute(PAGE_ID);
}
