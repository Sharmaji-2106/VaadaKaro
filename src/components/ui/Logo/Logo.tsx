import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
}

export const Logo = ({ size = 'md', theme = 'light' }: LogoProps) => {
  return (
    <div className={`${styles.logo} ${styles[size]} ${styles[theme]}`}>
      <span className={styles.name}>Vaada</span><span className={styles.suffix}>Karo</span>
      <div className={styles.subtext}>National Citizen Redressal Portal</div>
    </div>
  );
};
