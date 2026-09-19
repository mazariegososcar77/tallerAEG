// Las secciones del TALONARIO fisico A.E.G., una por pestaña, con los campos y el
// orden EXACTOS del papel (ver lib/workOrderTalonario.js). Son componentes de
// presentacion: reciben el formulario y sus funciones de cambio, y no saben nada de
// guardar. Los usan la Orden de Trabajo (Pre y Post) y la Orden de Servicio.
import { withUppercase } from '../../lib/text.js';
import { useEquipmentTypes } from '../../hooks/useEquipmentTypes.js';
import {
  WORK_CHECKS, LODO_CHECKS, EQUIPMENT_CHECKS, AIREADOR_SIZES, PHYSICAL_CHECKS, PUMP_SEAL_TYPES,
  SCREW_ROWS, VOLTAGES, normalizeEquipmentType,
} from '../../lib/workOrderTalonario.js';

export const C = { bg: 'var(--c-app)', card: 'var(--c-surface)', dark: 'var(--c-surface-2)', border: 'var(--c-line)', input: 'var(--c-surface-2)', text: 'var(--c-text)', muted: 'var(--c-muted)', orange: '#CA8A04' };
export const inp = { width: '100%', background: C.input, border: '1px solid ' + C.border, color: C.text, padding: '8px 10px', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', outline: 'none' };
export const lbl = { display: 'block', fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 };
export const sec = { background: C.card, border: '1px solid ' + C.border, borderRadius: 10, marginBottom: 12, overflow: 'hidden' };
const secHdr = { background: C.dark, borderBottom: '1px solid ' + C.border, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 8 };
const secTtl = { fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '1px', textTransform: 'uppercase' };
export const secBody = { padding: '14px 16px' };
const sub = { fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', margin: '14px 0 8px' };

export const SectionHeader = ({ title }) => (
  <div style={secHdr}>
    <span style={{ width: 6, height: 6, background: C.orange, borderRadius: '50%', display: 'inline-block' }}></span>
    <span style={secTtl}>{title}</span>
  </div>
);

const grid = (isMobile, cols, mobileCols = 2) => ({ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? mobileCols : cols}, 1fr)`, gap: 10, marginBottom: 10 });

// Una casilla clicable completa (mismo estilo de siempre).
function Check({ label, checked, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: checked ? C.orange + '18' : C.dark, border: '1px solid ' + (checked ? C.orange + '55' : C.border), borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <div style={{ width: 13, height: 13, borderRadius: 3, border: '1.5px solid ' + (checked ? C.orange : '#2a5540'), background: checked ? C.orange : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <span style={{ color: '#fff', fontSize: 8, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 11, color: checked ? C.text : 'var(--c-muted)', lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

// Grupo de casillas (varias pueden estar marcadas).
export function CheckGroup({ options, values, onToggle, cols = 3, isMobile, mobileCols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? mobileCols : cols}, 1fr)`, gap: 6 }}>
      {options.map((o) => (
        <Check key={o.value} label={o.label} checked={(values || []).includes(o.value)} onClick={() => onToggle(o.value)} />
      ))}
    </div>
  );
}

// Casillas de "Tipo de equipo": salen del catalogo configurable (Configuracion > Tipos de
// equipo), agrupadas por su categoria. Si el catalogo no carga o esta vacio se usa la lista
// fija de siempre, y un tipo ya marcado en la orden que se desactivo o borro sigue apareciendo
// para no perder el dato.
export function EquipmentTypeChecks({ values, onToggle, isMobile }) {
  const { equipmentTypes } = useEquipmentTypes({ quiet: true });
  const active = equipmentTypes.filter((t) => t.is_active);
  const base = active.length
    ? active.map((t) => ({ value: t.code, label: t.name, category: t.category }))
    : EQUIPMENT_CHECKS.map((t) => ({ ...t, category: '' }));
  const known = new Set(base.map((o) => o.value));
  const extra = (values || []).filter((v) => !known.has(v)).map((v) => ({
    value: v,
    label: equipmentTypes.find((t) => t.code === v)?.name || EQUIPMENT_CHECKS.find((t) => t.value === v)?.label || v,
    category: equipmentTypes.find((t) => t.code === v)?.category || 'Otros',
  }));
  const all = [...base, ...extra];
  const groups = [];
  for (const o of all) {
    let g = groups.find((x) => x.category === o.category);
    if (!g) { g = { category: o.category, options: [] }; groups.push(g); }
    g.options.push(o);
  }
  return (
    <>
      {groups.map((g) => (
        <div key={g.category} style={{ marginBottom: 8 }}>
          {groups.length > 1 && g.category && (
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', margin: '4px 0 6px' }}>{g.category}</div>
          )}
          <CheckGroup options={g.options} values={values} onToggle={onToggle} cols={4} isMobile={isMobile} />
        </div>
      ))}
    </>
  );
}

// Casillas de una sola opcion (SI/NO, tipo de sello...): tocar la marcada la desmarca.
export function ChoiceGroup({ options, value, onChange, cols, isMobile }) {
  return (
    <CheckGroup options={options} values={value ? [value] : []} cols={cols || options.length} isMobile={isMobile}
      mobileCols={cols || options.length} onToggle={(v) => onChange(value === v ? '' : v)} />
  );
}

const SI_NO = [{ value: 'si', label: 'SI' }, { value: 'no', label: 'NO' }];

const Field = ({ label, children }) => (<div><label style={lbl}>{label}</label>{children}</div>);
const Txt = ({ form, set, name, upper = true, type = 'text', ...rest }) => (
  <input type={type} value={form[name] ?? ''} style={inp} {...rest}
    onChange={upper ? withUppercase((e) => set(name, e.target.value)) : (e) => set(name, e.target.value)} />
);

// ═══ PESTAÑA 1: DATOS GENERALES ═══
// `extras`: lo que el sistema necesita y NO esta en el papel (estado, maquina del
// cliente, cotizacion vinculada) -- va arriba, aparte del papel. `clientPicker`: el
// selector de cliente que ocupa el lugar de "Cliente" del papel.
export function GeneralTab({ form, set, setForm, isMobile, extras, clientPicker }) {
  const toggleIn = (key, value) => setForm((f) => {
    const arr = f[key] || [];
    return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
  });
  const et = normalizeEquipmentType(form.equipment_type);
  const setEt = (patch) => setForm((f) => ({ ...f, equipment_type: { ...normalizeEquipmentType(f.equipment_type), ...patch } }));
  const toggleEt = (key, value) => {
    const arr = et[key];
    setEt({ [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  };
  const [ret1 = '', ret2 = ''] = String(form.retainers_count || '').split('/');
  const setRet = (a, b) => set('retainers_count', a || b ? `${a}/${b}` : '');
  const workTypes = form.work_types || [];
  const toggleWork = (v) => toggleIn('work_types', v);

  return (
    <>
      {extras}

      <div style={sec}>
        <SectionHeader title="Orden de trabajo" />
        <div style={secBody}>
          <div style={grid(isMobile, 3, 1)}>
            <Field label="Fecha de recibido *"><input type="date" value={form.received_at || ''} onChange={(e) => set('received_at', e.target.value)} style={inp} onClick={(e) => e.target.showPicker && e.target.showPicker()} /></Field>
            <Field label="Fecha de entrega"><input type="date" value={form.delivery_at || ''} onChange={(e) => set('delivery_at', e.target.value)} style={inp} onClick={(e) => e.target.showPicker && e.target.showPicker()} /></Field>
            <Field label="Código"><Txt form={form} set={set} name="code" /></Field>
          </div>
          <div style={grid(isMobile, 3, 1)}>
            <Field label="Cliente *">{clientPicker}</Field>
            <Field label="Proyecto"><Txt form={form} set={set} name="project" /></Field>
            <Field label="Autorizado por"><Txt form={form} set={set} name="authorized_by" /></Field>
          </div>
          <div style={{ maxWidth: isMobile ? '100%' : 280 }}>
            <Field label="Próximo servicio"><input type="date" value={form.next_service_at || ''} onChange={(e) => set('next_service_at', e.target.value)} style={inp} onClick={(e) => e.target.showPicker && e.target.showPicker()} /></Field>
          </div>

          <div style={sub}>Trabajo a realizar</div>
          <CheckGroup options={WORK_CHECKS} values={workTypes} onToggle={toggleWork} cols={5} isMobile={isMobile} />

          <div style={sub}>Aireadores</div>
          <CheckGroup options={AIREADOR_SIZES} values={et.aireador_sizes} onToggle={(v) => toggleEt('aireador_sizes', v)} cols={6} isMobile={isMobile} mobileCols={3} />
          <div style={{ ...grid(isMobile, 2, 2), marginTop: 10, maxWidth: isMobile ? '100%' : 420 }}>
            <Field label="Turbina: Kw"><input value={et.turbina_kw} onChange={withUppercase((e) => setEt({ turbina_kw: e.target.value }))} style={inp} /></Field>
            <Field label="Turbina: Hp"><input value={et.turbina_hp} onChange={withUppercase((e) => setEt({ turbina_hp: e.target.value }))} style={inp} /></Field>
          </div>

          <div style={sub}>Tipo de equipo</div>
          <EquipmentTypeChecks values={et.subtypes} onToggle={(v) => toggleEt('subtypes', v)} isMobile={isMobile} />

          <div style={sub}>Físico</div>
          <CheckGroup options={PHYSICAL_CHECKS} values={form.physical_parts} onToggle={(v) => toggleIn('physical_parts', v)} cols={4} isMobile={isMobile} />
          <div style={{ ...grid(isMobile, 4, 2), marginTop: 10 }}>
            <Field label="Cambio de cojinetes No."><Txt form={form} set={set} name="bearings_count" upper={false} /></Field>
            <Field label="Cojinetes medida 1 (mm)"><Txt form={form} set={set} name="bearings_mm" upper={false} /></Field>
            <Field label="Cojinetes medida 2 (mm)"><Txt form={form} set={set} name="bearings_mm_2" upper={false} /></Field>
            <Field label="Retenedores No.">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input value={ret1} onChange={(e) => setRet(e.target.value, ret2)} style={inp} />
                <span style={{ color: C.muted }}>/</span>
                <input value={ret2} onChange={(e) => setRet(ret1, e.target.value)} style={inp} />
              </div>
            </Field>
          </div>
          <div style={grid(isMobile, 4, 2)}>
            <div style={{ gridColumn: isMobile ? 'span 2' : 'span 2' }}><Field label="Torno"><Txt form={form} set={set} name="lathe_note" /></Field></div>
            <Field label="Tapa delantera (mm)"><Txt form={form} set={set} name="front_cover_mm" upper={false} /></Field>
            <Field label="Tapa trasera (mm)"><Txt form={form} set={set} name="rear_cover_mm" upper={false} /></Field>
          </div>
          <div style={grid(isMobile, 4, 2)}>
            <Field label="Rectificar eje (mm)"><Txt form={form} set={set} name="shaft_rectify_mm" upper={false} /></Field>
            <Field label="HP"><Txt form={form} set={set} name="lathe_hp" upper={false} /></Field>
            <Field label="KW"><Txt form={form} set={set} name="lathe_kw" upper={false} /></Field>
            <Field label="Camisa sello (mm)"><Txt form={form} set={set} name="seal_liner_mm" upper={false} /></Field>
          </div>
          <div style={grid(isMobile, 4, 2)}>
            <Field label="Perforación ventilador (mm)"><Txt form={form} set={set} name="fan_hole_mm" upper={false} /></Field>
            <div style={{ gridColumn: 'span 2' }}><Field label="Otros"><Txt form={form} set={set} name="physical_other" /></Field></div>
          </div>

          <div style={sub}>Extracción de lodo</div>
          <div style={{ maxWidth: isMobile ? '100%' : 420 }}>
            <CheckGroup options={LODO_CHECKS} values={workTypes} onToggle={toggleWork} cols={2} isMobile={isMobile} mobileCols={2} />
          </div>

          <div style={sub}>Datos del equipo</div>
          <div style={grid(isMobile, 6, 3)}>
            <Field label="HP"><Txt form={form} set={set} name="hp" type="number" upper={false} step="any" /></Field>
            <Field label="Kw"><Txt form={form} set={set} name="kw" type="number" upper={false} step="any" /></Field>
            <Field label="Volt."><Txt form={form} set={set} name="voltage" /></Field>
            <Field label="Amp."><Txt form={form} set={set} name="amperage" /></Field>
            <Field label="Marca"><Txt form={form} set={set} name="brand" /></Field>
            <Field label="RPM"><Txt form={form} set={set} name="rpm" type="number" upper={false} /></Field>
          </div>
          <div style={grid(isMobile, 4, 2)}>
            <Field label="Modelo"><Txt form={form} set={set} name="model" /></Field>
            <Field label="Frame"><Txt form={form} set={set} name="frame" /></Field>
            <Field label="Bomba marca"><Txt form={form} set={set} name="pump_brand" /></Field>
            <Field label="Serie"><Txt form={form} set={set} name="serial" /></Field>
          </div>
          <div style={grid(isMobile, 3, 1)}>
            <Field label="Impeller"><Txt form={form} set={set} name="pump_impeller" /></Field>
            <Field label="B.M."><Txt form={form} set={set} name="pump_bm" /></Field>
            <Field label="Medida de sello"><Txt form={form} set={set} name="pump_seal_size" /></Field>
          </div>
          <ChoiceGroup options={PUMP_SEAL_TYPES} value={form.pump_seal_type} onChange={(v) => set('pump_seal_type', v)} isMobile={isMobile} />

          <div style={{ marginTop: 14 }}>
            <Field label="Falla o problema">
              <textarea value={form.reported_problem || ''} onChange={withUppercase((e) => set('reported_problem', e.target.value))} rows={2} style={{ ...inp, resize: 'vertical' }} />
            </Field>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══ PESTAÑAS 2 y 6: MEDICIÓN (ingreso / entrega) ═══
export function MeasurementTab({ title, value, onChange, variant, isMobile }) {
  const v = value;
  const setField = (k, val) => onChange({ ...v, [k]: val });
  const setRow = (rowKey, col, val) => onChange({ ...v, [rowKey]: { ...v[rowKey], [col]: val } });
  const triple = (key, label) => (
    <div key={key} style={{ marginBottom: 10 }}>
      <label style={lbl}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {['l1', 'l2', 'l3'].map((col) => (
          <input key={col} placeholder={col.toUpperCase()} value={v[key]?.[col] || ''} onChange={(e) => setRow(key, col, e.target.value)} style={inp} />
        ))}
      </div>
    </div>
  );
  const single = (key, label) => (
    <Field label={label}><input value={v[key] || ''} onChange={withUppercase((e) => setField(key, e.target.value))} style={inp} /></Field>
  );
  const volts = VOLTAGES.map((x) => ({ value: x, label: `${x} V` }));
  return (
    <div style={sec}>
      <SectionHeader title={title} />
      <div style={secBody}>
        {triple('insulation', 'Medición de aislamiento')}
        {triple('ohms', 'Medición de OHMS')}
        {triple('amperage', 'Medición de amperaje')}
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Voltaje aplicado</label>
          <ChoiceGroup options={volts} value={v.applied_voltage} onChange={(x) => setField('applied_voltage', x)} isMobile={isMobile} cols={4} />
        </div>
        {triple('connection', 'Conexión')}
        {triple('temperature', 'Medición de temperatura')}
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Medición de tierra</label>
          <div style={{ maxWidth: 240 }}><ChoiceGroup options={SI_NO} value={v.ground} onChange={(x) => setField('ground', x)} /></div>
        </div>
        <div style={grid(isMobile, 3, 1)}>
          {single('pulley_distance', 'Distancia polea')}
          {single('coupling_distance', 'Distancia acople')}
          {single('turbine_distance', 'Distancia turbina')}
        </div>
        {variant === 'intake' ? (
          <div style={grid(isMobile, 2, 1)}>
            <div>
              <label style={lbl}>Balanceo dinámico Rotor</label>
              <div style={{ maxWidth: 240 }}><ChoiceGroup options={SI_NO} value={v.balance_rotor} onChange={(x) => setField('balance_rotor', x)} /></div>
            </div>
            <div>
              <label style={lbl}>Balanceo dinámico Turbina</label>
              <div style={{ maxWidth: 240 }}><ChoiceGroup options={SI_NO} value={v.balance_turbine} onChange={(x) => setField('balance_turbine', x)} /></div>
            </div>
          </div>
        ) : (
          <div>
            <label style={lbl}>Alambre</label>
            <div style={{ maxWidth: 360 }}>
              <ChoiceGroup options={[{ value: 'ultrashield', label: 'UltraShield' }, { value: 'normal', label: 'Normal' }]}
                value={v.wire_type} onChange={(x) => setField('wire_type', x)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ PESTAÑA 3: COMPONENTES ═══
// Tres columnas, como en el papel (7 + 7 + 6), leyendo cada columna de arriba abajo.
export function ComponentsTab({ items, onToggle, isMobile }) {
  const size = Math.ceil(items.length / 3);
  const columns = [0, 1, 2].map((c) => items.slice(c * size, (c + 1) * size).map((it, i) => ({ it, index: c * size + i })));
  return (
    <div style={sec}>
      <SectionHeader title="Componentes" />
      <div style={secBody}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 6 : 14, alignItems: 'start' }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {col.map(({ it, index }) => (
                <Check key={index} label={it.name} checked={!!it.has_item} onClick={() => onToggle(index)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ PESTAÑA 4: TORNILLOS ═══
export function ScrewsTab({ value, onChange }) {
  const rows = value && value.length ? value : SCREW_ROWS.map((r) => ({ part: r.part, quantity: '' }));
  const setQty = (part, qty) => onChange(rows.map((r) => (r.part === part ? { ...r, quantity: qty } : r)));
  return (
    <div style={sec}>
      <SectionHeader title="Tornillos" />
      <div style={{ ...secBody, maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}><span style={lbl}>Cantidad</span></div>
        {SCREW_ROWS.map((r) => {
          const row = rows.find((x) => x.part === r.part) || {};
          return (
            <div key={r.part} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 12, color: C.text }}>{r.label}</span>
              <input value={row.quantity || ''} onChange={(e) => setQty(r.part, e.target.value)} style={{ ...inp, width: 80 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══ PESTAÑA 5: OBSERVACIONES ═══
export function ObservationsTab({ form, set }) {
  return (
    <div style={sec}>
      <SectionHeader title="Observaciones" />
      <div style={secBody}>
        <div style={{ background: '#ef444414', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: C.text }}>
          <strong style={{ color: '#ef4444' }}>IMPORTANTE:</strong> No nos hacemos responsables por equipos recibidos después de 30 días.
        </div>
        <textarea value={form.observations || ''} onChange={withUppercase((e) => set('observations', e.target.value))} rows={6} style={{ ...inp, resize: 'vertical' }} />
      </div>
    </div>
  );
}

// ═══ PESTAÑA 7: CIERRE (los campos del pie del talonario) ═══
export function ClosingFields({ form, set, isMobile }) {
  return (
    <div style={sec}>
      <SectionHeader title="Cierre" />
      <div style={secBody}>
        <div style={grid(isMobile, 2, 1)}>
          <Field label="Técnico A.E.G. desarma"><Txt form={form} set={set} name="tech_disarm" /></Field>
          <Field label="Técnico A.E.G. arma"><Txt form={form} set={set} name="tech_assemble" /></Field>
          <Field label="Supervisor A.E.G. recibe equipo"><Txt form={form} set={set} name="supervisor_aeg_receive" /></Field>
          <Field label="Supervisor de turno Cliente entrega equipo"><Txt form={form} set={set} name="supervisor_client_deliver" /></Field>
          <Field label="Supervisor A.E.G. entrega equipo"><Txt form={form} set={set} name="supervisor_aeg_deliver" /></Field>
          <Field label="Supervisor de turno Cliente recibe equipo"><Txt form={form} set={set} name="supervisor_client_receive" /></Field>
        </div>
        <div style={grid(isMobile, 3, 1)}>
          <Field label="Envío"><Txt form={form} set={set} name="shipping" /></Field>
          <Field label="Cotización #"><Txt form={form} set={set} name="quotation_number" /></Field>
          <Field label="DTE #">
            <Txt form={form} set={set} name="dte_number" />
            {form.dte_number && <span style={{ fontSize: 10, color: C.muted }}>(se llena solo al facturar)</span>}
          </Field>
        </div>
        <div style={grid(isMobile, 3, 1)}>
          <Field label="O.C. #"><Txt form={form} set={set} name="oc_number" /></Field>
          <Field label="WhatsApp"><Txt form={form} set={set} name="whatsapp_number" upper={false} /></Field>
        </div>
      </div>
    </div>
  );
}
