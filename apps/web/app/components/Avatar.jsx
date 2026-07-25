'use client';

export default function Avatar({ avatarUrl, firstName, size = 64 }) {
  const style = { width: size, height: size };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={firstName || ''}
        style={style}
        className="rounded-full object-cover mx-auto"
      />
    );
  }

  const initial = firstName ? firstName.charAt(0).toUpperCase() : '?';
  return (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className="rounded-full bg-violet-600 text-white font-semibold flex items-center justify-center mx-auto"
    >
      {initial}
    </div>
  );
}
