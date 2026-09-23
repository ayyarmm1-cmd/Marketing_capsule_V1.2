import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SEARCHABLE_ACTIONS, SearchAction } from '../../constants/searchConfig';
import { performGlobalSearch, SearchResult } from '../../services/searchService';

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const GlobalSearchBar: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [entityResults, setEntityResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const accessibleActions = useMemo(() => {
    if (!user) return [];

    return SEARCHABLE_ACTIONS.filter(action => {
      if (action.roles && !action.roles.includes(user.role)) return false;
      if (action.excludedRoles && action.excludedRoles.includes(user.role)) return false;
      if (action.requiredPermissions && action.requiredPermissions.length > 0) {
        return action.requiredPermissions.some(permission => hasPermission(permission));
      }
      return true;
    });
  }, [user, hasPermission]);

  const routeResults = useMemo(() => {
    if (!query.trim()) {
      return accessibleActions.slice(0, 8);
    }

    const normalized = query.trim().toLowerCase();
    return accessibleActions
      .filter(action => {
        const haystack = [
          action.label,
          action.description,
          action.path,
          action.category,
          ...(action.keywords || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [accessibleActions, query]);

  // Search entities with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim() || !user) {
      setEntityResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await performGlobalSearch(query, hasPermission);
        setEntityResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setEntityResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, user, hasPermission]);

  // Combine route and entity results
  const allResults = useMemo(() => {
    const routeResultsMapped: SearchResult[] = routeResults.map(action => ({
      id: action.id,
      type: 'route' as const,
      label: action.label,
      description: action.description,
      path: action.path,
      category: action.category,
    }));

    return [...entityResults, ...routeResultsMapped];
  }, [entityResults, routeResults]);

  const groupedResults = useMemo(() => {
    return allResults.reduce<Record<string, SearchResult[]>>((acc, result) => {
      const key = result.category || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(result);
      return acc;
    }, {});
  }, [allResults]);

  const flatResults = allResults;

  useEffect(() => {
    setHighlightIndex(0);
  }, [flatResults.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsActive(true);
      }
    };

    window.addEventListener('keydown', handleKeyShortcut);
    return () => window.removeEventListener('keydown', handleKeyShortcut);
  }, []);

  const handleSelect = useCallback((result: SearchResult | SearchAction) => {
    const path = 'path' in result ? result.path : result.path;
    navigate(path);
    setQuery('');
    setIsActive(false);
    setHighlightIndex(0);
    inputRef.current?.blur();
  }, [navigate]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!flatResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex(prev => (prev + 1) % flatResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = flatResults[highlightIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (event.key === 'Escape') {
      setIsActive(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = isActive && flatResults.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-primary-action focus-within:ring-2 focus-within:ring-primary-action/20 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-slate-400 dark:text-slate-500">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          className="ml-2 w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none dark:text-slate-100"
          placeholder="Search clients, businesses, employees, sales, invoices, or pages…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsActive(true)}
          onKeyDown={handleKeyDown}
          aria-label="Global search"
        />
        <span className="hidden text-xs text-slate-400 md:inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 font-medium dark:border-slate-600 dark:text-slate-300">
          <span className="font-semibold">⌘</span>K
        </span>
      </div>

      {isActive && query && !isSearching && flatResults.length === 0 && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-slate-500 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No matches for “{query}”.
        </div>
      )}

      {isSearching && query && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-slate-500 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Searching...
        </div>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {Object.entries(groupedResults).map(([category, results]) => (
            <div key={category} className="px-3 py-2">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {category}
              </p>
              <ul className="space-y-1">
                {results.map(result => {
                  const index = flatResults.findIndex(item => item.id === result.id);
                  const isHighlighted = index === highlightIndex;
                  const isEntity = result.type !== 'route';
                  return (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(result)}
                        className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition ${
                          isHighlighted
                            ? 'bg-primary-action/10 text-primary-action dark:bg-primary-action/20'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isEntity && (
                            <span className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {result.type}
                            </span>
                          )}
                          <span className="text-sm font-semibold">{result.label}</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{result.description}</span>
                        <span className="mt-1 inline-flex items-center text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          {result.path}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar;


