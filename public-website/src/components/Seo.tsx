import { Helmet } from 'react-helmet-async';
import { BASE_URL } from '../utils/seo';

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
  keywords?: string;
  author?: string;
  type?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export default function Seo({
  title,
  description,
  canonical,
  image,
  jsonLd,
  keywords,
  author = 'Marketing Capsule',
  type = 'website',
  noindex = false,
  nofollow = false,
}: SeoProps) {
  const siteName = 'Marketing Capsule';
  const fullTitle = title.includes('|') ? title : `${title} | ${siteName}`;
  const defaultImage = `${BASE_URL}/logo.png`;
  const ogImage = image || defaultImage;
  const canonicalUrl = canonical || BASE_URL;
  const defaultKeywords = 'digital marketing, social media marketing, logo design, content creation, boosting service, TikTok marketing, online licensing, Myanmar marketing agency, social media design, marketing consultation';

  // Robots meta
  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow',
  ].join(', ');

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />
      <meta name="theme-color" content="#06B6D4" />
      
      {/* Additional SEO Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="format-detection" content="telephone=yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="application-name" content={siteName} />
      <meta name="msapplication-TileColor" content="#06B6D4" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Performance and Core Web Vitals */}
      <meta httpEquiv="x-dns-prefetch-control" content="on" />
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      <link rel="preconnect" href={BASE_URL} crossOrigin="anonymous" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${siteName} - ${title}`} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${siteName} - ${title}`} />
      <meta name="twitter:creator" content="@marketingcapsule" />
      <meta name="twitter:site" content="@marketingcapsule" />

      {/* Additional SEO */}
      <meta name="geo.region" content="MM" />
      <meta name="geo.placename" content="Myanmar" />
      <meta name="ICBM" content="16.4907, 97.6258" />

      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Alternate languages */}
      <link rel="alternate" hrefLang="en" href={canonicalUrl} />
      <link rel="alternate" hrefLang="my" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Favicons */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png" />

      {/* Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}


