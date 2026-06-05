// Purpose: Suspense-фолбэк для ленивой загрузки R3F-Canvas | занимает место, чтобы не было layout shift
export default function CanvasFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: '#0a1628',
        backgroundImage:
          'radial-gradient(ellipse at center, rgba(20,40,70,0.4) 0%, rgba(10,22,40,0.95) 70%)',
        zIndex: 0,
      }}
    />
  )
}
