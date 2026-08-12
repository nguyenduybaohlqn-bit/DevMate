import { useState, type FormEvent } from "react";
import { sendSignUpRequest } from "../services/authApi";
import type { useAuth } from "../hooks/useAuth";
import { ReactorCore } from "./ReactorCore";
import styles from "./AuthScreen.module.css";

interface AuthScreenProps {
  auth: ReturnType<typeof useAuth>;
}

/** Màn hình đăng nhập/đăng ký tối giản, đứng trước app chính khi chưa
 *  xác thực. Dùng lại đúng `useAuth` (signIn/signUp) đã có sẵn trong dự án. */
export function AuthScreen({ auth }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUpError, setSignUpError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    if (isSignUp) {
      try {
        await sendSignUpRequest({ username, email, password });
        await auth.signIn({ email, password });
      } catch {
        setSignUpError("Đăng ký thất bại: Email có thể đã được sử dụng hoặc dữ liệu không hợp lệ.");
      }
    } else {
      await auth.signIn({ email, password });
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={`${styles.card} frame`}>
        <div className={styles.brand}>
          <ReactorCore size={56} state={auth.loading ? "thinking" : "idle"} />
          <b>NEXUS</b>
          <span>{isSignUp ? "TẠO TÀI KHOẢN MỚI" : "ĐĂNG NHẬP HỆ THỐNG"}</span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {isSignUp && (
            <div className={styles.field}>
              <label htmlFor="username">TÊN NGƯỜI DÙNG</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="email">EMAIL</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">MẬT KHẨU</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          {(auth.error || signUpError) && <div className={styles.error}>{auth.error ?? signUpError}</div>}

          <button type="submit" className={styles.submit} disabled={auth.loading}>
            {auth.loading ? "ĐANG XỬ LÝ..." : isSignUp ? "ĐĂNG KÝ" : "ĐĂNG NHẬP"}
          </button>
        </form>

        <button type="button" className={styles.switchMode} onClick={() => setIsSignUp((v) => !v)}>
          {isSignUp ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
        </button>
      </div>
    </div>
  );
}
