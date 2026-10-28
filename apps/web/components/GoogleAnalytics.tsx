import Script from "next/script";
import { GA_ID } from "@/lib/analytics";

export default function GoogleAnalytics() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`,
        }}
      />
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
    </>
  );
}
