'use client';

import { useEffect, useState } from 'react';
import { SearchableSelect, type SearchableSelectProps, type SelectOption } from './SearchableSelect';

export interface DependentSelectProps extends Omit<SearchableSelectProps, 'options' | 'loading' | 'disabled'> {
  /** The field this one depends on. Empty means "not chosen yet": the select is disabled. */
  parentValue: string;
  /** Options for a parent value. May be async (fetched data). */
  loadOptions: (parentValue: string) => SelectOption[] | Promise<SelectOption[]>;
  /** Shown while disabled, e.g. "Select state first". */
  disabledPlaceholder: string;
  /** Options to offer in addition to the loaded ones (e.g. a district suggested by PIN lookup). */
  extraOptions?: SelectOption[];
  disabled?: boolean;
}

/**
 * A SearchableSelect whose options depend on another field. It reloads its options whenever the
 * parent changes. Clearing this field's value when the parent changes is the caller's job, done in
 * the parent's onChange, so it happens synchronously and never races with loading.
 */
export function DependentSelect({
  parentValue,
  loadOptions,
  disabledPlaceholder,
  extraOptions,
  placeholder,
  disabled = false,
  emptyText,
  ...rest
}: DependentSelectProps) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!parentValue) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    Promise.resolve(loadOptions(parentValue))
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // loadOptions is expected to be stable (module-level or memoised); reload only on parent change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentValue]);

  const merged = extraOptions?.length
    ? [...options, ...extraOptions.filter((x) => !options.some((o) => o.value === x.value))]
    : options;

  return (
    <SearchableSelect
      {...rest}
      options={merged}
      loading={loading}
      disabled={disabled || !parentValue}
      placeholder={parentValue ? placeholder : disabledPlaceholder}
      emptyText={failed ? "Couldn't load the list. Reload the page and try again." : emptyText}
    />
  );
}
