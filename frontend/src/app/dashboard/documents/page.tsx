import Link from 'next/link';
import { PenLine } from 'lucide-react';
import DocumentVault from '@/components/features/legal/DocumentVault';
import dash from '../dashboard.module.css';

export default function MyDocumentsPage() {
  return (
    <>
      <div className="page-band">
        <div className={`page-band-inner ${dash.bandRow}`}>
          <div>
            <span className="eyebrow">Your dashboard</span>
            <h1>My documents</h1>
            <p className="lead">
              Letters and drafts you saved. Edit them, download a PDF, and note when you sent each one and what
              reply you got.
            </p>
          </div>
          <Link href="/draft-letter" className={dash.newBtn}>
            <PenLine size={18} /> Draft a letter
          </Link>
        </div>
      </div>

      <div className={dash.container}>
        <DocumentVault
          empty={
            <>
              Nothing saved yet. <Link href="/draft-letter">Draft a complaint letter</Link> and save it to keep it here.
            </>
          }
        />
      </div>
    </>
  );
}
