"use client";
import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';

export type SelectOption = {
  id: string;
  name: string;
};

export type SharedSelectPropsBase = {
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export type ComplexSelectProps = SharedSelectPropsBase & {
  simple?: false;
  value?: SelectOption | null;
  onChange: (value: SelectOption | null) => void;
  options: SelectOption[];
  allowCreate?: boolean;
  onCreate?: (name: string) => Promise<SelectOption | null>;
};

export type SimpleSelectProps = SharedSelectPropsBase & {
  simple: true;
  simpleValue?: string;
  onSimpleChange?: (value: string) => void;
  simpleOptions?: { value: string; label: string }[];
};

export type SharedSelectProps = ComplexSelectProps | SimpleSelectProps;

export default function SharedSelect(props: SharedSelectProps) {
  const {
    placeholder = "Select...",
    className = "",
    disabled = false,
  } = props;
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SelectOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on query
  useEffect(() => {
    if (props.simple) return;
    
    if (!query.trim()) {
      setFilteredOptions(props.options);
    } else {
      const filtered = props.options.filter(option =>
        option.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [props, query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // For simple selects (like Status)
  if (props.simple) {
    return (
      <select
        className={`rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
        value={props.simpleValue || ''}
        onChange={(e) => props.onSimpleChange?.(e.target.value)}
        disabled={disabled}
      >
        {(props.simpleOptions || []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // For complex selects with type-ahead (Vendor/Project)
  const complexProps = props as ComplexSelectProps;
  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        className={`w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
        placeholder={placeholder}
        value={complexProps.value ? complexProps.value.name : query}
        onChange={(e) => {
          if (complexProps.value) {
            complexProps.onChange(null);
          }
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
      />
      
      {isOpen && !complexProps.value && query && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-neutral-500">{t('common.noMatches')}</li>
          ) : (
            filteredOptions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none"
                  onClick={() => {
                    complexProps.onChange(option);
                    setQuery('');
                    setIsOpen(false);
                  }}
                >
                  {option.name}
                </button>
              </li>
            ))
          )}
          
          {complexProps.allowCreate && complexProps.onCreate && query.trim() && (
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none"
                onClick={async () => {
                  const newOption = await complexProps.onCreate!(query.trim());
                  if (newOption) {
                    complexProps.onChange(newOption);
                    setQuery('');
                    setIsOpen(false);
                  }
                }}
              >
                {t('common.create')} &quot;{query}&quot;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}