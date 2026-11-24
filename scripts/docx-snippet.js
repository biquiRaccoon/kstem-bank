/* ---------- Word(.docx) 만들기: 외부 라이브러리 없이 브라우저에서 직접 생성 ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8){ let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zip(files){ // 무압축(stored) zip
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const [name, text] of files){
    const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true);
    lh.setUint32(14,crc,true); lh.setUint32(18,data.length,true); lh.setUint32(22,data.length,true); lh.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(lh.buffer), nm, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true);
    ch.setUint32(16,crc,true); ch.setUint32(20,data.length,true); ch.setUint32(24,data.length,true); ch.setUint16(28,nm.length,true); ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer), nm);
    off += 30 + nm.length + data.length;
  }
  const csize = central.reduce((s,a)=>s+a.length,0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true); end.setUint32(12,csize,true); end.setUint32(16,off,true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
const X = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const FONT = '맑은 고딕';
function r(text, o = {}){ // run
  const pr = `<w:rPr><w:rFonts w:ascii="${FONT}" w:eastAsia="${FONT}" w:hAnsi="${FONT}"/>${o.b?'<w:b/>':''}${o.color?`<w:color w:val="${o.color}"/>`:''}<w:sz w:val="${o.sz||20}"/><w:szCs w:val="${o.sz||20}"/></w:rPr>`;
  return String(text).split('\n').map((t,i)=>`${i?'<w:br/>':''}<w:r>${pr}<w:t xml:space="preserve">${X(t)}</w:t></w:r>`).join('');
}
function p(runs, o = {}){
  return `<w:p><w:pPr><w:spacing w:before="${o.before||0}" w:after="${o.after||0}" w:line="${o.line||276}" w:lineRule="auto"/>${o.ind?`<w:ind w:left="${o.ind}" w:hanging="${o.hang||0}"/>`:''}<w:jc w:val="${o.align||'left'}"/></w:pPr>${runs}</w:p>`;
}
function tc(content, o = {}){
  const paras = Array.isArray(content) ? content.join('') : (content.startsWith('<w:') ? content : p(r(content,{sz:o.sz,b:o.b}),{align:o.align||'center'}));
  return `<w:tc><w:tcPr><w:tcW w:w="${o.w}" w:type="dxa"/>${o.span?`<w:gridSpan w:val="${o.span}"/>`:''}${o.vm?`<w:vMerge${o.vm==='restart'?' w:val="restart"':''}/>`:''}${o.fill?`<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>`:''}<w:vAlign w:val="${o.va||'center'}"/><w:tcMar><w:top w:w="50" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/></w:tcMar></w:tcPr>${paras}${/<w:p[ >]/.test(paras.slice(-12))||paras.endsWith('</w:p>')?'':'<w:p/>'}</w:tc>`;
}
function tr(cells, h){ return `<w:tr>${h?`<w:trPr><w:trHeight w:val="${h}" w:hRule="atLeast"/></w:trPr>`:''}${cells.join('')}</w:tr>`; }
function tbl(widths, rows){
  const b = v => `<w:${v} w:val="single" w:sz="6" w:space="0" w:color="555555"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,c)=>a+c,0)}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(b).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
}
function docxFile(bodyXml){
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="850" w:bottom="900" w:left="850" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`],
  ]);
}

/* 신청서 내용 (센터 양식 기준) */
const DOW = '일월화수목금토';
function sqData(){
  const f = formData();
  const items = basket.filter(b => b.office === state.office);
  const d = s => s ? new Date(s+'T00:00:00') : null;
  const a = d(f.from), b = d(f.to);
  const days = a && b ? Math.round((b-a)/86400000) + 1 : null;
  const t = new Date();
  return { center: f.gmCenter || '○○과학교육센터', school: f.school, name: f.teacher.replace(/^교사\s*/,''), gradeSubj: f.gradeSubj, phone: f.phone, mobile: f.mobile,
    a, b, days, items, today: `${t.getFullYear()}. ${t.getMonth()+1}. ${t.getDate()}.` };
}
const md = x => x ? `${x.getMonth()+1}월 ${x.getDate()}일` : '    월    일';
function sqTexts(s){
  return {
    title: `${s.center} 교구 대여 신청서`,
    period: `${s.a ? s.a.getFullYear() : 2026}년 ${md(s.a)} ~ ${md(s.b)} (${s.days ?? '   '}일간)`,
    ret: `※ 교구 반납일: ${s.b ? `${s.b.getFullYear()}년 ${md(s.b)}(${DOW[s.b.getDay()]})` : '2026년     월     일(  )'}`,
    privacy: `${s.center} 교구 대여와 관련하여 귀하의 개인정보(성명, 학교명, 학교전화, 휴대폰 번호)를 수집·이용하고자 하오니 동의 여부를 체크하여 주시기 바랍니다. 개인정보 제공 및 활용에 거부할 권리가 있으나, 동의하지 않을 경우, 교구 대여가 불가능합니다.`,
    notes: ['담당 교사가 직접 방문하여 교구를 수령하고 반납하셔야 합니다. (택배 수령 및 반납 불가)',
            '대여 교구는 담당 교사가 직접 활용할 수 있어야 하며, 학교에서 탐구 활동 시 학생 대상 안전교육 및 활용 수칙에 대한 사전 교육을 실시해야 합니다.',
            '교구는 정확한 매뉴얼대로 사용해야 하며 분실이나 파손되지 않도록 유의 부탁드립니다. 분실이나 파손 시, 대여교에서 구입·경비하여 반납해야 합니다.'],
    agree: '■ 동의함          □ 동의하지 않음',
    pledge: `위 신청자는 본인의 책임하에 서울특별시 ${s.center}의 교구를 대여하고자 합니다.`,
  };
}
function sqDocx(){
  const s = sqData(), T = sqTexts(s), H = 'DCE6F2', L = 'F2F2F2';
  const W = [1700, 3000, 1800, 3706];
  const lbl = (t, o={}) => tc(t, {w:W[0], fill:L, b:true, ...o});
  const nW = [1250, 4750, 950, 1300];
  const n = Math.max(5, s.items.length);
  const inner = tbl(nW, [
    tr([tc('구분',{w:nW[0],fill:L,b:true}), tc('교구명',{w:nW[1],fill:L,b:true}), tc('수량',{w:nW[2],fill:L,b:true}), tc('비고',{w:nW[3],fill:L,b:true})], 380),
    ...Array.from({length:n}, (_,i) => { const it = s.items[i];
      return tr([tc(it?it.cat:'',{w:nW[0]}), tc(it?it.name:'',{w:nW[1]}), tc(it?String(it.qty):'',{w:nW[2]}), tc('',{w:nW[3], vm: i===0?'restart':'cont'})], 400); })
  ]);
  const body = [
    p(r(T.title,{b:true,sz:34}),{align:'center',after:200}),
    tbl(W, [
      tr([tc('신청 교사 정보',{w:10206,span:4,fill:H,b:true})], 400),
      tr([lbl('학 교 명'), tc(s.school,{w:W[1]+W[2]+W[3],span:3})], 440),
      tr([lbl('성      명'), tc(s.name,{w:W[1]}), tc('학년 또는\n담당교과',{w:W[2],fill:L,b:true}), tc(s.gradeSubj,{w:W[3]})], 440),
      tr([lbl('학교전화'), tc(s.phone,{w:W[1]}), tc('휴 대 폰',{w:W[2],fill:L,b:true}), tc(s.mobile,{w:W[3]})], 440),
      tr([tc('교구 신청 내용',{w:10206,span:4,fill:H,b:true})], 400),
      tr([lbl('대여 기간'), tc([p(r(T.period),{align:'center'}), p(r(T.ret),{align:'center'})],{w:W[1]+W[2]+W[3],span:3})], 600),
      tr([lbl('개인정보제공\n동의 여부'), tc([p(r(T.privacy,{sz:17}),{align:'both'}), p(r(T.agree),{align:'center',before:60})],{w:W[1]+W[2]+W[3],span:3})]),
      tr([lbl('유의 사항'), tc([...T.notes.map(t=>p(r('○ '+t,{sz:17}),{ind:200,hang:200,align:'both'})), p(r(T.agree),{align:'center',before:60})],{w:W[1]+W[2]+W[3],span:3})]),
      tr([tc([p(r('대여 희망 교구',{b:true}),{align:'center'}), p(r('※교구 목록 참고',{sz:16}),{align:'center'})],{w:W[0],fill:L}), tc([inner, p('')],{w:W[1]+W[2]+W[3],span:3})]),
    ]),
    p(r(T.pledge),{align:'center',before:240,after:200}),
    p(r(s.today),{align:'center',after:160}),
    p(r(`대여인: 교사 ${s.name || '          '}   (서명)`),{align:'center',after:120}),
    p(r(`${s.school || '○○초등학교'}장(직인생략)`,{b:true,sz:24}),{align:'center'}),
  ].join('');
  return docxFile(body);
}
function gmDocx(){
  return docxFile(buildGm().split('\n').map(l => p(r(l,{sz:22}),{line:360})).join(''));
}
function sqPreview(){
  const s = sqData(), T = sqTexts(s), n = Math.max(5, s.items.length);
  const rows = Array.from({length:n}, (_,i)=>{ const it=s.items[i]; return `<tr><td>${it?esc(it.cat):''}</td><td>${it?esc(it.name):''}</td><td>${it?it.qty:''}</td>${i===0?`<td rowspan="${n}"></td>`:''}</tr>`; }).join('');
  return `<h3>${esc(T.title)}</h3><table class="sqt">
  <tr><th colspan="4" class="sec">신청 교사 정보</th></tr>
  <tr><th>학교명</th><td colspan="3">${esc(s.school)}</td></tr>
  <tr><th>성명</th><td>${esc(s.name)}</td><th>학년 또는<br>담당교과</th><td>${esc(s.gradeSubj)}</td></tr>
  <tr><th>학교전화</th><td>${esc(s.phone)}</td><th>휴대폰</th><td>${esc(s.mobile)}</td></tr>
  <tr><th colspan="4" class="sec">교구 신청 내용</th></tr>
  <tr><th>대여 기간</th><td colspan="3" class="c">${esc(T.period)}<br>${esc(T.ret)}</td></tr>
  <tr><th>개인정보제공<br>동의 여부</th><td colspan="3" class="s">${esc(T.privacy)}<div class="c">${T.agree}</div></td></tr>
  <tr><th>유의 사항</th><td colspan="3" class="s">${T.notes.map(t=>`○ ${esc(t)}`).join('<br>')}<div class="c">${T.agree}</div></td></tr>
  <tr><th>대여 희망 교구<br><small>※교구 목록 참고</small></th><td colspan="3" style="padding:6px"><table class="sqt in"><tr><th>구분</th><th>교구명</th><th>수량</th><th>비고</th></tr>${rows}</table></td></tr>
  </table>
  <p class="c">${esc(T.pledge)}</p><p class="c">${s.today}</p><p class="c">대여인: 교사 ${esc(s.name)} (서명)</p><p class="c"><b>${esc(s.school || '○○초등학교')}장(직인생략)</b></p>`;
}
function itemsTsv(){ return sqData().items.map(it => `${it.cat}\t${it.name}\t${it.qty}`).join('\n'); }
