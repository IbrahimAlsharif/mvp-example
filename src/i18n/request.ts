import { getRequestConfig } from "next-intl/server";

/**
 * Arabic-first (guardrail G6). Arabic is the default and only required locale at
 * MVP; English copy can be added later without changing call sites.
 */
export const LOCALE = "ar";

export default getRequestConfig(async () => {
  return {
    locale: LOCALE,
    messages: (await import(`../../messages/${LOCALE}.json`)).default,
  };
});
