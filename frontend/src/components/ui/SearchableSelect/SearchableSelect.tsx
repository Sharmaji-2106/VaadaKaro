'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { normalize } from '@/lib/locations';
import styles from './SearchableSelect.module.css';

export interface SelectOption {
  value: string;
  label: string;
  /** Extra search terms, e.g. a district's old name. */
  keywords?: string[];
}

export interface SearchableSelectProps {
  /** id of the input; point the field's <label htmlFor> at it. */
  id: string;
  /** id of that <label>, used to name the option list. */
  labelId: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Ids of hint/error elements describing the field. */
  describedBy?: string;
  invalid?: boolean;
  emptyText?: string;
}

/**
 * Type-to-filter select (WAI-ARIA combobox with a listbox popup). Only values from `options`
 * can be chosen. Keys: ↑/↓ move, Enter selects, Esc closes, Home/End jump.
 *
 * The input carries no visual styling of its own beyond the chevron and states, so inside a form
 * it inherits the surrounding input styles and looks like the other fields.
 */
export function SearchableSelect({
  id,
  labelId,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
  describedBy,
  invalid = false,
  emptyText = 'No results',
}: SearchableSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  // A value not in the list (e.g. a district suggested by PIN lookup) still shows as typed.
  const selectedLabel = selected?.label ?? value;

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    const starts: SelectOption[] = [];
    const contains: SelectOption[] = [];
    for (const o of options) {
      const terms = [o.label, ...(o.keywords ?? [])].map(normalize);
      if (terms.some((t) => t.startsWith(q))) starts.push(o);
      else if (terms.some((t) => t.includes(q))) contains.push(o);
    }
    return [...starts, ...contains];
  }, [options, query]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  };

  const close = () => {
    setOpen(false);
    setQuery('');
    setActive(-1);
  };

  const choose = (option: SelectOption) => {
    onChange(option.value);
    close();
  };

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActive(filtered.length - 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (!open) openList();
        else if (filtered[active]) choose(filtered[active]);
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case 'Tab':
        close();
        break;
    }
  };

  const activeId = open && filtered[active] ? `${listId}-opt-${active}` : undefined;

  return (
    <div className={styles.wrapper}>
      <input
        id={id}
        type="text"
        role="combobox"
        className={styles.input}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-busy={loading || undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={open && selectedLabel ? selectedLabel : placeholder}
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onClick={() => {
          if (!open) openList();
        }}
        onBlur={close}
        onKeyDown={onKeyDown}
      />
      <span className={styles.icon} aria-hidden="true">
        {loading ? <Loader2 size={18} className={styles.spin} /> : <ChevronDown size={18} />}
      </span>

      {open && (
        <ul id={listId} ref={listRef} role="listbox" aria-labelledby={labelId} className={styles.list}>
          {loading ? (
            <li className={styles.status} role="presentation">Loading…</li>
          ) : filtered.length === 0 ? (
            <li className={styles.status} role="presentation">{emptyText}</li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${listId}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.option} ${index === active ? styles.active : ''} ${isSelected ? styles.selected : ''}`}
                  // mousedown, not click: keeps focus in the input so onBlur doesn't close the list first
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(option);
                  }}
                  onMouseMove={() => index !== active && setActive(index)}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={16} aria-hidden="true" />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
