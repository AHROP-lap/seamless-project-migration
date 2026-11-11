import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import bodyHtml from "@/site/body.html?raw";

const SCRIPTS = ["config", "messages", "memories", "effects", "player", "app"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Our Little Universe ❤️" },
      { name: "description", content: "عالم صغير معمول لشخص واحد بس ❤️" },
      { property: "og:title", content: "Our Little Universe ❤️" },
      { property: "og:description", content: "عالم صغير معمول لشخص واحد بس ❤️" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: "/css/fonts.css?v=1" },
      { rel: "stylesheet", href: "/css/style.css?v=31" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    if ((window as unknown as { __oluLoaded?: boolean }).__oluLoaded) return;
    (window as unknown as { __oluLoaded?: boolean }).__oluLoaded = true;
    let chain = Promise.resolve();
    for (const name of SCRIPTS) {
      chain = chain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = `/js/${name}.js?v=30`;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error(`Failed to load ${name}.js`));
            document.body.appendChild(s);
          }),
      );
    }
  }, []);

  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}
