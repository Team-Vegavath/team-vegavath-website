import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <svg width="26" height="28" viewBox="0 0 26 28" fill="none">
          <path
            d="M13 1L2 5.5V14C2 19.5 7 24.5 13 27C19 24.5 24 19.5 24 14V5.5L13 1Z"
            fill="#EF5D08"
          />
          <path
            d="M13 6L7 8.5V13.5C7 16.8 9.5 19.8 13 21C16.5 19.8 19 16.8 19 13.5V8.5L13 6Z"
            fill="#0a0a0a"
          />
          <path
            d="M9.5 9.5L13 17.5L16.5 9.5"
            stroke="#EF5D08"
            strokeWidth="2.2"
            strokeLinecap="square"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
