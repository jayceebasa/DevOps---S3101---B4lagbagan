

import React from "react";
import Head from "next/head";
// Prevent static generation for next-auth compatibility
export async function getServerSideProps() {
  return { props: {} };
}
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);


  if (status === "loading") {
    return (
      <>
        <Head />
        <div style={{
          minHeight: "100vh",
          background: "#f6f8fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif"
        }}>
          <div style={{
            background: "#fff",
            padding: "2.5rem 2rem",
            borderRadius: "18px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            minWidth: 340,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24, color: "#222" }}>Loading...</h1>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Login | BrainBytes</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "#f6f8fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif"
      }}>
        <div style={{
          background: "#fff",
          padding: "2.5rem 2rem",
          borderRadius: "18px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          minWidth: 340,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24, color: "#222", letterSpacing: "-0.5px" }}>Login to BrainBytes</h1>
          <button
            onClick={() => signIn("google")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 32px",
              fontSize: 17,
              fontWeight: 600,
              borderRadius: 10,
              background: "#fff",
              color: "#222",
              border: "1.5px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(66,133,244,0.08)",
              cursor: "pointer",
              transition: "background 0.2s, box-shadow 0.2s",
              fontFamily: "inherit"
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f1f3f4'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            <svg width="22" height="22" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
              <g>
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.36 1.53 7.82 2.81l5.77-5.77C34.64 3.54 29.74 1 24 1 14.82 1 6.98 6.98 3.69 15.09l6.73 5.22C12.13 14.09 17.56 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.18 5.59C43.98 37.02 46.1 31.23 46.1 24.5z"/>
                <path fill="#FBBC05" d="M10.42 28.31A14.5 14.5 0 0 1 9.5 24c0-1.5.26-2.95.72-4.31l-6.73-5.22A23.97 23.97 0 0 0 1 24c0 3.77.9 7.34 2.49 10.53l6.93-6.22z"/>
                <path fill="#EA4335" d="M24 46.5c6.48 0 11.93-2.14 15.9-5.84l-7.18-5.59c-2.01 1.35-4.59 2.16-8.72 2.16-6.44 0-11.87-4.59-13.58-10.78l-6.93 6.22C6.98 41.02 14.82 46.5 24 46.5z"/>
                <path fill="none" d="M1 1h46v46H1z"/>
              </g>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </>
  );
}
