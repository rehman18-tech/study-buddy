function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Perform a live web search using DuckDuckGo's HTML interface
 * @param {string} query - The search query
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
async function searchWeb(query, limit = 3) {
  if (!query || !query.trim()) return [];
  
  const SERPER_API_KEY = process.env.SERPER_API_KEY;
  if (SERPER_API_KEY && SERPER_API_KEY !== 'your_serper_api_key_here') {
    try {
      console.log(`🔍 [SearchService] Requesting Google search via Serper for: "${query}" (limit: ${limit})`);
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ q: query, num: limit })
      });

      if (!response.ok) {
        throw new Error(`Serper API returned status ${response.status}`);
      }

      const data = await response.json();
      const results = (data.organic || []).slice(0, limit).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet
      }));

      console.log(`🔍 [SearchService] Serper returned ${results.length} results.`);
      return results;
    } catch (err) {
      console.warn("⚠️ [SearchService] Serper API request failed, falling back to DuckDuckGo:", err.message);
    }
  }

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    console.log(`🔍 [SearchService] Searching web (DDG Scrape) for: "${query}" (limit: ${limit})`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned status ${response.status}`);
    }

    const html = await response.text();
    const results = [];
    const resultBlockRegex = /<div class="result results_links results_links_deep web-result[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    
    let match;
    while ((match = resultBlockRegex.exec(html)) !== null && results.length < limit) {
      const block = match[0];
      
      const titleMatch = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
      const snippetMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block);
      
      if (titleMatch && snippetMatch) {
        let targetUrl = titleMatch[1];
        if (targetUrl.includes('uddg=')) {
          const parts = targetUrl.split('uddg=');
          if (parts[1]) {
            targetUrl = decodeURIComponent(parts[1].split('&')[0]);
          }
        }
        
        const title = decodeEntities(titleMatch[2].replace(/<[^>]*>/g, '').trim());
        const snippet = decodeEntities(snippetMatch[1].replace(/<[^>]*>/g, '').trim());
        
        results.push({ title, url: targetUrl, snippet });
      }
    }
    
    console.log(`🔍 [SearchService] Found ${results.length} web search results.`);
    return results;
  } catch (err) {
    console.error('⚠️ [SearchService] Web search failed:', err.message);
    return [];
  }
}

/**
 * Fetch direct summary & facts from Wikipedia REST API
 * @param {string} query 
 * @returns {Promise<{title: string, extract: string, description: string, url: string} | null>}
 */
async function fetchWikiSummary(query) {
  if (!query || !query.trim()) return null;
  try {
    const cleanQuery = query.replace(/^(what|who|where|when|why|how|is|are|can|could|tell me about|explain|define)\s+/i, '').trim();
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'StudyBuddyEducationalApp/1.0' }
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const firstHit = searchData?.query?.search?.[0];
    if (firstHit && firstHit.title) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`;
      const summaryRes = await fetch(summaryUrl, {
        headers: { 'User-Agent': 'StudyBuddyEducationalApp/1.0' }
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData && summaryData.extract) {
          return {
            title: summaryData.title,
            extract: summaryData.extract,
            description: summaryData.description || '',
            url: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(firstHit.title)}`
          };
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ [SearchService] Wikipedia summary fetch failed:", err.message);
  }
  return null;
}

module.exports = {
  searchWeb,
  fetchWikiSummary
};

