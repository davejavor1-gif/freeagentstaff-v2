"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const META_PIXEL_ID = "1076144888456361";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { loaded?: boolean };
  }
}

export function trackTalentCompleteRegistration() {
  if (typeof window === "undefined") {
    return;
  }

  window.fbq?.("track", "CompleteRegistration", { content_name: "Talent Registration" });
}

export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialPageView = useRef(true);

  useEffect(() => {
    if (isInitialPageView.current) {
      isInitialPageView.current = false;
      return;
    }

    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('set', 'autoConfig', false, '${META_PIXEL_ID}');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
        `.trim(),
      }}
    />
  );
}
