'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SearchableSelect, type SelectOption } from '@/components/ui/SearchableSelect/SearchableSelect';
import { DependentSelect } from '@/components/ui/SearchableSelect/DependentSelect';
import { AuthorityCard } from '@/components/features/authorities/AuthorityCard';
import cards from '@/components/features/authorities/AuthorityCard.module.css';
import { DEPARTMENTS, categoriesFor } from '@/lib/departments';
import { getDistricts, getStates, type StateOption } from '@/lib/locations';
import { findAuthorities, type Authority } from '@/services/legal';
import styles from './authorities.module.css';

const ANY = '';
const DEPARTMENT_OPTIONS: SelectOption[] = [{ value: ANY, label: 'Any department' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))];

export default function AuthoritiesPage() {
  const [department, setDepartment] = useState(ANY);
  const [category, setCategory] = useState(ANY);
  const [states, setStates] = useState<StateOption[]>([]);
  const [stateCode, setStateCode] = useState(ANY);
  const [district, setDistrict] = useState(ANY);
  const [results, setResults] = useState<Authority[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStates().then(setStates).catch(() => setStates([]));
  }, []);

  const stateName = states.find((s) => s.code === stateCode)?.name;
  const stateOptions = useMemo<SelectOption[]>(
    () => [{ value: ANY, label: 'Anywhere in India' }, ...states.map((s) => ({ value: s.code, label: s.name }))],
    [states]
  );

  useEffect(() => {
    let cancelled = false;
    setError('');
    findAuthorities({ department, category, state: stateName, district })
      .then((r) => !cancelled && setResults(r))
      .catch(() => !cancelled && setError('Could not load the directory. Please try again.'));
    return () => {
      cancelled = true;
    };
  }, [department, category, stateName, district]);

  return (
    <>
      <div className="page-band">
        <div className="page-band-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>›</span> <span>Where to complain</span>
          </nav>
          <h1>Where to complain</h1>
          <p className="lead">
            Official offices and portals that take complaints, by department and place. Every entry links to the
            official source and shows when we last checked it.
          </p>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.filters}>
          <div className={styles.field}>
            <label id="dir-dept-label" htmlFor="dir-dept">Department</label>
            <SearchableSelect
              id="dir-dept"
              labelId="dir-dept-label"
              value={department}
              options={DEPARTMENT_OPTIONS}
              onChange={(v) => {
                setDepartment(v);
                setCategory(ANY);
              }}
            />
          </div>
          <div className={styles.field}>
            <label id="dir-cat-label" htmlFor="dir-cat">Problem</label>
            <DependentSelect
              id="dir-cat"
              labelId="dir-cat-label"
              parentValue={department}
              loadOptions={(d) => [{ value: ANY, label: 'Any problem' }, ...categoriesFor(d).map((c) => ({ value: c, label: c }))]}
              value={category}
              onChange={setCategory}
              placeholder="Any problem"
              disabledPlaceholder="Choose a department first"
            />
          </div>
          <div className={styles.field}>
            <label id="dir-state-label" htmlFor="dir-state">State or UT</label>
            <SearchableSelect
              id="dir-state"
              labelId="dir-state-label"
              value={stateCode}
              options={stateOptions}
              loading={states.length === 0}
              onChange={(v) => {
                setStateCode(v);
                setDistrict(ANY);
              }}
            />
          </div>
          <div className={styles.field}>
            <label id="dir-district-label" htmlFor="dir-district">District</label>
            <DependentSelect
              id="dir-district"
              labelId="dir-district-label"
              parentValue={stateCode}
              loadOptions={async (code) => [
                { value: ANY, label: 'Whole state' },
                ...(await getDistricts(code)).map((d) => ({ value: d, label: d })),
              ]}
              value={district}
              onChange={setDistrict}
              placeholder="Whole state"
              disabledPlaceholder="Choose a state first"
            />
          </div>
        </div>

        {error ? (
          <p className={cards.empty} role="alert">{error}</p>
        ) : results === null ? (
          <p className={styles.status}>Loading…</p>
        ) : results.length === 0 ? (
          <p className={cards.empty}>
            No office in our directory matches yet. Your local municipal office, collectorate or police station can
            tell you where to send it. You can also <Link href="/draft-letter">draft the letter</Link> now and send it
            once you know.
          </p>
        ) : (
          <>
            <p className={styles.status} aria-live="polite">
              {results.length} {results.length === 1 ? 'place' : 'places'}, most local first.
            </p>
            <div className={cards.list}>
              {results.map((a) => <AuthorityCard key={a.id} authority={a} />)}
            </div>
          </>
        )}

        <p className={styles.footnote}>
          VaadaKaro is not a government service and does not submit complaints for you. Spotted a wrong or outdated
          entry? Tell us through the contact on the <Link href="/privacy">privacy page</Link>.
        </p>
      </div>
    </>
  );
}
