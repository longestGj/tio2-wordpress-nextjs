import "../../../../components/sites/tio2-my/editorial/app-plas.css";

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from "../../../../lib/editorial/malaysia-editorial-route";

const PAGE_ID = "APP-PLAS";

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID);
}

export default function Page() {
  return renderMalaysiaEditorialRoute(PAGE_ID);
}
