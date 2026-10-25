import { Check } from "lucide-react";
import styles from "./login.module.css";

export default function AuthAside({ title, points }: { title: string; points: string[] }) {
  return (
    <aside className={styles.infoSide}>
      <h2>{title}</h2>
      <ul>
        {points.map((p) => (
          <li key={p}>
            <span className={styles.tick}><Check size={14} strokeWidth={3} /></span>
            {p}
          </li>
        ))}
      </ul>
      <p className={styles.infoFoot}>
        Your data is processed in India under the DPDP Act, 2023.
      </p>
    </aside>
  );
}
