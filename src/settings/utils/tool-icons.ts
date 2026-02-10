// Get category icon - shared across settings and UI
export function getCategoryIcon(category: string): string {
	switch (category) {
		case 'note-management':
			// Note/document icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
			</svg>`;
		case 'search-web':
			// Web search icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.35-4.35"></path>
				<circle cx="12" cy="12" r="10" opacity="0.3"></circle>
			</svg>`;
		case 'system-command':
			// Terminal/Command icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="4 17 10 11 4 5"></polyline>
				<line x1="12" y1="19" x2="20" y2="19"></line>
			</svg>`;
		case 'stock-china':
		case 'stock-global':
		case 'stock':
		case 'financial':
			// Chart/Stock icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="20" x2="12" y2="10"></line>
				<line x1="18" y1="20" x2="18" y2="4"></line>
				<line x1="6" y1="20" x2="6" y2="16"></line>
			</svg>`;
		case 'file-system':
			// Folder icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
			</svg>`;
		case 'editor':
			// Edit icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
			</svg>`;
		case 'search':
		case 'vault-search':
			// Search in vault icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.35-4.35"></path>
			</svg>`;
		case 'search-engines':
		case 'web-search':
			// Web search icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.35-4.35"></path>
				<circle cx="12" cy="12" r="10" opacity="0.3"></circle>
			</svg>`;
		case 'web-content':
			// Globe/Web icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="2" y1="12" x2="22" y2="12"></line>
				<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
			</svg>`;
		case 'futures':
			// Trading/Futures icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
			</svg>`;
		case 'bonds':
			// Certificate/Bond icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<circle cx="8.5" cy="8.5" r="1.5"></circle>
				<path d="M21 15l-5-5L5 21"></path>
			</svg>`;
		case 'options':
			// Options/Derivatives icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
				<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
				<line x1="12" y1="22.08" x2="12" y2="12"></line>
			</svg>`;
		case 'funds':
			// Fund/Briefcase icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
				<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
			</svg>`;
		case 'forex':
			// Currency/Exchange icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="1" x2="12" y2="23"></line>
				<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
			</svg>`;
		case 'crypto':
			// Crypto/Bitcoin icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
				<path d="M12 17h.01"></path>
			</svg>`;
		case 'derivatives':
			// Derivatives icon - abstract connected nodes
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="18" cy="5" r="3"></circle>
				<circle cx="6" cy="12" r="3"></circle>
				<circle cx="18" cy="19" r="3"></circle>
				<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
				<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
			</svg>`;
		case 'microstructure':
			// Microstructure icon - layered structure
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="7" height="7"></rect>
				<rect x="14" y="3" width="7" height="7"></rect>
				<rect x="14" y="14" width="7" height="7"></rect>
				<rect x="3" y="14" width="7" height="7"></rect>
			</svg>`;
		case 'credit':
		case 'credit-risk':
			// Credit icon - credit card or rating
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
				<line x1="1" y1="10" x2="23" y2="10"></line>
			</svg>`;
		case 'alternative':
			// Alternative data icon - database with sparkles
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
				<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
				<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
			</svg>`;
		case 'international':
			// International icon - globe with grid
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="2" y1="12" x2="22" y2="12"></line>
				<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
			</svg>`;
		case 'commodity':
		case 'commodity-forex':
			// Commodity icon - package/box
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
				<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
				<line x1="12" y1="22.08" x2="12" y2="12"></line>
			</svg>`;
		case 'technical':
			// Technical analysis icon - candlestick
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="2" x2="12" y2="6"></line>
				<line x1="12" y1="18" x2="12" y2="22"></line>
				<rect x="8" y="6" width="8" height="12"></rect>
			</svg>`;
		case 'macro':
		case 'macro-economy':
			// Macro/Economy icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
				<polyline points="17 6 23 6 23 12"></polyline>
			</svg>`;
		case 'industry':
			// Industry/Factory icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="2" y="8" width="20" height="14" rx="2"></rect>
				<path d="M6 8V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"></path>
				<line x1="6" y1="1" x2="6" y2="4"></line>
				<line x1="10" y1="1" x2="10" y2="4"></line>
				<line x1="14" y1="1" x2="14" y2="4"></line>
				<line x1="18" y1="1" x2="18" y2="4"></line>
			</svg>`;
		case 'news':
		case 'news-info':
			// News/Newspaper icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
				<line x1="10" y1="6" x2="18" y2="6"></line>
				<line x1="10" y1="10" x2="18" y2="10"></line>
				<line x1="10" y1="14" x2="18" y2="14"></line>
			</svg>`;
		case 'sentiment':
			// Sentiment/Heart icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
				<line x1="9" y1="9" x2="9.01" y2="9"></line>
				<line x1="15" y1="9" x2="15.01" y2="9"></line>
			</svg>`;
		case 'esg':
		case 'esg-industry':
			// ESG/Leaf icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M17 8c0-3.3-2.7-6-6-6S5 4.7 5 8s2.7 6 6 6 6-2.7 6-6z"></path>
				<path d="M12 14v9"></path>
			</svg>`;
		case 'risk':
			// Risk/Alert icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
				<line x1="12" y1="9" x2="12" y2="13"></line>
				<line x1="12" y1="17" x2="12.01" y2="17"></line>
			</svg>`;
		case 'utility':
			// Utility/Tool icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
			</svg>`;
		case 'weather':
			// Weather/Cloud icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
			</svg>`;
		case 'entertainment':
			// Entertainment/Play icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<polygon points="10 8 16 12 10 16 10 8"></polygon>
			</svg>`;
		case 'other':
		default:
			// Default/More icon
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="1"></circle>
				<circle cx="19" cy="12" r="1"></circle>
				<circle cx="5" cy="12" r="1"></circle>
			</svg>`;
	}
}
