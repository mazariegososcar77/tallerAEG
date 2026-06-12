export default function PageHeader({ title, subtitle, emoji, children }) {
  return (
    <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {emoji && <span style={{ fontSize:26 }}>{emoji}</span>}
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:'#e2e8f0' }}>{title}</h1>
          {subtitle && <p style={{ fontSize:13, color:'#5a7aa8', margin:0 }}>{subtitle}</p>}
        </div>
      </div>
      {children && <div style={{ display:'flex', alignItems:'center', gap:8 }}>{children}</div>}
    </div>
  );
}
