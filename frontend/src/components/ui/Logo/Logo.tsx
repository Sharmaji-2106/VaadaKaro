import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
  showMark?: boolean;
}

export const LogoMark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={styles.mark}>
    <rect width="32" height="32" rx="8" fill="#0b1f33" />
    <path d="M8 10.5a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 24 10.5v7a2.5 2.5 0 0 1-2.5 2.5H15l-4.2 3.6c-.5.4-1.3.1-1.3-.6V20h-.5A1 1 0 0 1 8 19z" fill="#fff" />
    <path d="M12.2 14.2l2.6 2.6 5-5" fill="none" stroke="#0f7a45" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="25" cy="7" r="3.5" fill="#f28c28" stroke="#0b1f33" strokeWidth="1.5" />
  </svg>
);

export const Logo = ({ size = 'md', theme = 'light', showMark = true }: LogoProps) => {
  const markSize = size === 'sm' ? 26 : size === 'lg' ? 40 : 32;
  return (
    <div className={`${styles.logo} ${styles[size]} ${styles[theme]}`}>
      {showMark && <LogoMark size={markSize} />}
      <span className={styles.word}>
        <span className={styles.name}>Vaada</span><span className={styles.suffix}>Karo</span>
      </span>
    </div>
  );
};
