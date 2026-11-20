import React, { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Empty, Form, Input, Modal, Select, Table, Tabs, Tag, message } from 'antd';
import { warrantyApi } from '../../api/warrantyApi';
import { useAuth } from '../../context/AuthContext';
import RepairReceipt from './RepairReceipt';
import { dateTime, pickupDefault, repairPayload, repairServices, repairStatuses } from './repairUtils';
import {
  filterWarrantyClaims,
  nextWarrantyTransition,
  warrantyStatusMeta,
  warrantyStatuses,
} from './warrantyClaimUtils';
import '../workspace.css';

const benefitName = value => ({ FRAME_ADJUSTMENT:'Chỉnh gọng', LENS_COATING:'Bảo hành lớp phủ', EXCHANGE_30_DAYS:'Đổi 1–1 trong 30 ngày' })[value] || value || '—';
const shortDate = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
export default function WarrantyPage() {
  const { user } = useAuth();
  const actor = user?.staffName || user?.fullName || user?.staffId || '';
  const [tab,setTab] = useState('claims');
  const [kind,setKind] = useState('phone');
  const [lookup,setLookup] = useState('');
  const [lookupRows,setLookupRows] = useState([]);
  const [lookedUp,setLookedUp] = useState(false);
  const [lookupBusy,setLookupBusy] = useState(false);
  const [lookupError,setLookupError] = useState('');
  const [claims,setClaims] = useState([]);
  const [claimsLoading,setClaimsLoading] = useState(false);
  const [claimsError,setClaimsError] = useState('');
  const [claimQuery,setClaimQuery] = useState('');
  const [claimStatusFilter,setClaimStatusFilter] = useState('ALL');
  const [activeClaimId,setActiveClaimId] = useState(null);
  const [claimHistory,setClaimHistory] = useState([]);
  const [claimHistoryLoading,setClaimHistoryLoading] = useState(false);
  const [repairs,setRepairs] = useState([]);
  const [repairQuery,setRepairQuery] = useState('');
  const [loading,setLoading] = useState(false);
  const [repairError,setRepairError] = useState('');
  const [formOpen,setFormOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const [activeId,setActiveId] = useState(null);
  const [receipt,setReceipt] = useState(null);
  const [policies,setPolicies] = useState([]);
  const [form] = Form.useForm();
  const active = repairs.find(item => item.id === activeId);
  const activeClaim = claims.find(item => item.id === activeClaimId);
  const visibleClaims = filterWarrantyClaims(claims, claimQuery, claimStatusFilter);
  const pendingClaimCount = claims.filter(c => String(c.status || '').toUpperCase() === 'WAITING_PROCESS').length;
  async function loadClaims() {
    setClaimsLoading(true); setClaimsError('');
    try {
      const rows = await warrantyApi.getAllWarranties();
      const list = Array.isArray(rows?.data) ? rows.data : Array.isArray(rows) ? rows : [];
      setClaims(list);
    } catch (error) {
      setClaimsError(error.message || 'Không tải được danh sách yêu cầu bảo hành.');
    } finally {
      setClaimsLoading(false);
    }
  }
  async function openClaimDetail(claim) {
    setActiveClaimId(claim.id);
    setClaimHistory([]);
    setClaimHistoryLoading(true);
    try {
      const history = await warrantyApi.getWarrantyHistory(claim.id);
      setClaimHistory(Array.isArray(history) ? history : []);
    } catch {
      setClaimHistory([]);
    } finally {
      setClaimHistoryLoading(false);
    }
  }
  async function updateClaimStatus(item, next) {
    if (!item?.id || !next?.status) return;
    setSaving(true);
    try {
      const updated = await warrantyApi.updateWarrantyStatus(item.id, {
        status: next.status,
        statusLabel: next.statusLabel,
        statusColor: next.statusColor,
        techNote: next.techNote || `Nhân viên ${actor || 'hệ thống'} chuyển trạng thái sang ${next.statusLabel}`,
      });
      const saved = updated?.data ?? updated;
      if (!saved?.id) throw new Error('Chưa nhận được dữ liệu cập nhật.');
      setClaims(prev => prev.map(row => row.id === saved.id ? saved : row));
      if (activeClaimId === saved.id) {
        openClaimDetail(saved);
      }
      message.success(`Đã cập nhật phiếu #${saved.warrantyCode} sang "${next.statusLabel}".`);
    } catch (error) {
      message.error(error.message || 'Không thể cập nhật trạng thái bảo hành.');
    } finally {
      setSaving(false);
    }
  }
  async function loadPolicies() {
    try {
      const list = await warrantyApi.getPolicies();
      if (Array.isArray(list)) setPolicies(list);
    } catch {}
  }
  async function loadRepairs(query = repairQuery) {
    setLoading(true); setRepairError('');
    try { const rows=await warrantyApi.getRepairs(query); if(!Array.isArray(rows))throw new Error('Dữ liệu phiếu không hợp lệ.');setRepairs(rows); }
    catch(error){setRepairError(error.message || 'Không tải được phiếu sửa chữa.');}
    finally{setLoading(false);}
  }
  async function loadAllLookups() {
    setLookupBusy(true); setLookupError('');
    try {
      const rows = await warrantyApi.search('phone', 'ALL');
      if (Array.isArray(rows)) {
        setLookupRows(rows);
        setLookedUp(true);
      }
    } catch {
      // Ignore initial preload errors
    } finally {
      setLookupBusy(false);
    }
  }
  useEffect(()=>{loadClaims(); loadRepairs(''); loadPolicies(); loadAllLookups();},[]);
  async function search(customVal) {
    const q = (typeof customVal === 'string' ? customVal : lookup).trim();
    if(!q){
      await loadAllLookups();
      return;
    }
    setLookupBusy(true);setLookupError('');
    try{const rows=await warrantyApi.search(kind,q);if(!Array.isArray(rows))throw new Error('Dữ liệu tra cứu không hợp lệ.');setLookupRows(rows);setLookedUp(true);}
    catch(error){setLookupError(error.message || 'Không tra cứu được bảo hành.');}
    finally{setLookupBusy(false);}
  }
  function openReception(purchase) {
    form.resetFields();
    form.setFieldsValue({
      customerId: purchase?.customerId ?? '',
      orderId: purchase?.orderId ?? '',
      orderItemId: purchase?.orderItemId ?? '',
      customerName: purchase?.customerName || '',
      customerPhone: purchase?.customerPhone || '',
      productName: purchase?.productName || '',
      productBarcode: purchase?.productBarcode || '',
      expectedPickupAt: pickupDefault(),
      requestedServices: ['FRAME_ADJUSTMENT'],
      notes: purchase?.orderCode ? `Tiếp nhận từ đơn ${purchase.orderCode}` : ''
    });
    setFormOpen(true);
  }
  async function create(values) {
    setSaving(true);
    try{
      const saved=await warrantyApi.createRepair(repairPayload(values,actor));
      if(!saved?.id || !saved?.serviceCode)throw new Error('Chưa nhận được mã phiếu đã lưu.');
      setRepairs(previous=>[saved,...previous.filter(item=>item.id!==saved.id)]);
      setFormOpen(false);setTab('repairs');setReceipt(saved);form.resetFields();message.success('Đã lưu phiếu sửa chữa.');
    }catch(error){message.error(error.message || 'Không thể lưu phiếu.');}
    finally{setSaving(false);}
  }
  async function updateRepair(item, targetStatus = null) {
    const status = targetStatus || (item.status === 'RECEIVED' ? 'READY_FOR_PICKUP' : item.status === 'IN_PROGRESS' ? 'READY_FOR_PICKUP' : null);
    if(!status)return;
    setSaving(true);
    try{
      const saved=await warrantyApi.updateRepair(item.id,{status,changedBy:actor});
      if(!saved?.id)throw new Error('Chưa nhận được phiếu đã cập nhật.');
      setRepairs(previous=>previous.map(row=>row.id===saved.id?saved:row));message.success('Đã hoàn thành phiếu sửa chữa.');
    }catch(error){message.error(error.message || 'Không thể cập nhật phiếu.');}
    finally{setSaving(false);}
  }
  async function activate(item) {
    setLookupBusy(true);
    try{
      await warrantyApi.createWarranty({orderId:item.orderId,orderItemId:item.orderItemId,benefitType:item.benefitType});
      await search();
    }catch(error){message.error(error.message || 'Không thể kích hoạt bảo hành.');}
    finally{setLookupBusy(false);}
  }
  const lookupColumns=[
    {title:'Đơn / Sản phẩm',key:'product',render:(_,item)=><div><span className="workspace-name">{item.orderCode}</span><div>{item.productName}</div><div className="workspace-muted">{item.productBarcode || item.productSku}</div></div>},
    {title:'Khách hàng',key:'customer',render:(_,item)=><div>{item.customerName}<div className="workspace-muted">{item.customerPhone}</div></div>},
    {title:'Bảo hành',key:'warranty',render:(_,item)=><div>{item.warranties?.length?item.warranties.map(w=><div key={w.id}><strong>{benefitName(w.benefitType)}</strong><div className="workspace-muted">{w.expiresAt?`Đến ${shortDate(w.expiresAt)}`:'Theo thời hạn chính sách'} · {w.statusLabel || w.status}</div></div>):<span className="workspace-muted">Chưa kích hoạt · {benefitName(item.benefitType)}</span>}</div>},
    {title:'',key:'action',width:170,render:(_,item)=><div className="workspace-actions">{!item.warranties?.length && item.benefitType && <Button disabled={lookupBusy} onClick={()=>activate(item)}>Kích hoạt</Button>}<Button onClick={()=>openReception(item)}>Tiếp nhận sửa</Button></div>},
  ];
  const claimColumns=[
    {title:'Mã phiếu',dataIndex:'warrantyCode',render:(value,item)=><button className="workspace-link" onClick={()=>openClaimDetail(item)}>{value || `WAR-${item.id}`}</button>},
    {title:'Khách hàng',dataIndex:'customerName',render:(value,item)=><div><span className="workspace-name">{value || '—'}</span><div className="workspace-muted">{item.customerPhone || '—'}</div></div>},
    {title:'Đơn / Sản phẩm',key:'product',render:(_,item)=><div><span className="workspace-name">{item.productName || '—'}</span><div className="workspace-muted">{item.originalOrderCode || 'Tại quầy'}{item.policyRef ? ` · ${item.policyRef}` : ''}</div></div>},
    {title:'Mô tả / Tình trạng',dataIndex:'issueDescription',render:v=><div style={{maxWidth:240,whiteSpace:'normal'}}>{v || '—'}</div>},
    {title:'Ngày gửi',dataIndex:'createdAt',render:dateTime},
    {title:'Trạng thái',dataIndex:'status',render:(value,item)=>{const meta=warrantyStatusMeta(value,item.statusLabel);return <Tag color={meta.color}>{meta.label}</Tag>;}},
    {title:'',key:'actions',width:180,render:(_,item)=>{const next=nextWarrantyTransition(item.status);return <div className="workspace-actions">{next&&<Button size="small" type="primary" loading={saving} onClick={()=>updateClaimStatus(item,next)}>{next.actionLabel}</Button>}<Button size="small" onClick={()=>openClaimDetail(item)}>Chi tiết</Button></div>;}},
  ];
  const repairColumns=[
    {title:'Mã phiếu',dataIndex:'serviceCode',render:(value,item)=><button className="workspace-link" onClick={()=>setActiveId(item.id)}>{value}</button>},
    {title:'Khách hàng',dataIndex:'customerName',render:(value,item)=><div><span className="workspace-name">{value}</span><div className="workspace-muted">{item.customerPhone}</div></div>},
    {title:'Sản phẩm',dataIndex:'productName'},
    {title:'Hẹn trả',dataIndex:'expectedPickupAt',render:dateTime},
    {title:'Trạng thái',dataIndex:'status',render:value=><Tag color={value==='READY_FOR_PICKUP'||value==='COMPLETED'?'green':value==='IN_PROGRESS'?'blue':'orange'}>{repairStatuses[value] || value}</Tag>},
    {title:'Thao tác',key:'print',width:220,render:(_,item)=><div className="workspace-actions">
      {item.status!=='READY_FOR_PICKUP'&&item.status!=='COMPLETED'&&<Button type="primary" size="small" loading={saving} onClick={()=>updateRepair(item,'READY_FOR_PICKUP')}>Hoàn thành</Button>}
      <Button size="small" onClick={()=>setReceipt(item)}>Biên nhận</Button>
    </div>},
  ];
  return <main className="simple-workspace">
    <header className="workspace-header"><div><h1>Bảo hành & sửa chữa</h1><p>Tra cứu quyền lợi và quản lý phiếu tiếp nhận.</p></div><Button type="primary" onClick={()=>openReception()}>Tiếp nhận sửa chữa</Button></header>
    <section className="workspace-panel" style={{padding:'12px 20px'}}><Tabs activeKey={tab} onChange={setTab} items={[
      {key:'claims',label:pendingClaimCount>0?`Yêu cầu bảo hành (${pendingClaimCount})`:'Yêu cầu bảo hành',children:<>
        <div className="workspace-toolbar" style={{padding:'8px 0 20px'}}>
          <select className="workspace-filter" aria-label="Lọc trạng thái" value={claimStatusFilter} onChange={e=>setClaimStatusFilter(e.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(warrantyStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
          <Input.Search allowClear className="workspace-search" aria-label="Tìm yêu cầu bảo hành" placeholder="Mã phiếu, SĐT, tên khách hoặc sản phẩm" value={claimQuery} onChange={e=>setClaimQuery(e.target.value)} />
          <Button onClick={loadClaims} loading={claimsLoading}>Làm mới</Button>
        </div>
        {claimsError?<Alert type="error" showIcon message={claimsError}/>:<Table rowKey="id" columns={claimColumns} dataSource={visibleClaims} loading={claimsLoading} scroll={{x:900}} pagination={{pageSize:10,hideOnSinglePage:true}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có yêu cầu bảo hành nào"/>}}/>}
      </>},
      {key:'lookup',label:'Tra cứu bảo hành',children:<>
        <div className="workspace-toolbar" style={{padding:'8px 0 20px'}}><select className="workspace-filter" aria-label="Tra cứu theo" value={kind} onChange={event=>setKind(event.target.value)}><option value="phone">Số điện thoại / Khách hàng / Mã đơn</option><option value="barcode">Barcode / SKU sản phẩm</option></select><Input.Search className="workspace-search" allowClear aria-label="Số điện thoại hoặc barcode" placeholder={kind==='phone'?'Nhập SĐT, tên khách hoặc mã đơn hàng...':'Quét hoặc nhập barcode / mã SKU'} value={lookup} onChange={event=>{setLookup(event.target.value); if(!event.target.value.trim()) loadAllLookups();}} onSearch={val=>search(val)} enterButton="Tra cứu" loading={lookupBusy} /><Button onClick={()=>{setLookup(''); loadAllLookups();}} loading={lookupBusy}>Xem tất cả</Button></div>
        {lookupError?<Alert type="error" showIcon message={lookupError}/>:!lookedUp?<p className="workspace-muted" style={{padding:'12px 0 24px'}}>Nhập số điện thoại hoặc mã vạch để tra cứu đơn và thời hạn bảo hành.</p>:<Table rowKey={item=>`${item.orderId}-${item.orderItemId}-${item.benefitType}`} columns={lookupColumns} dataSource={lookupRows} loading={lookupBusy} scroll={{x:760}} pagination={{pageSize:8,hideOnSinglePage:true}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy đơn mua phù hợp"/>}}/>}
      </>},
      {key:'repairs',label:'Phiếu sửa chữa',children:<>
        <div className="workspace-toolbar" style={{padding:'8px 0 20px'}}><Input.Search allowClear className="workspace-search" aria-label="Tìm phiếu sửa chữa" placeholder="Mã phiếu hoặc số điện thoại" value={repairQuery} onChange={event=>setRepairQuery(event.target.value)} onSearch={()=>loadRepairs()} /><Button onClick={()=>loadRepairs()} loading={loading}>Làm mới</Button></div>
        {repairError?<Alert type="error" showIcon message={repairError}/>:<Table rowKey="id" columns={repairColumns} dataSource={repairs} loading={loading} scroll={{x:850}} pagination={{pageSize:10,hideOnSinglePage:true}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có phiếu phù hợp"/>}}/>}
      </>},
      {key:'policies',label:'Chính sách bảo hành',children:<>
        <Table
          rowKey={p => `${p.benefitType}-${p.version}`}
          dataSource={policies}
          pagination={false}
          columns={[
            { title: 'Quyền lợi', dataIndex: 'benefitType', render: benefitName },
            { title: 'Mã chính sách', dataIndex: 'policyCode' },
            { title: 'Phiên bản', dataIndex: 'version', render: v => <Tag color="blue">v{v || 1}</Tag> },
            { title: 'Thời hạn', dataIndex: 'durationDays', render: d => d ? `${d} ngày` : 'Trọn đời' },
            { title: 'Điều kiện áp dụng', dataIndex: 'coverageTerms' },
          ]}
        />
      </>},
    ]}/></section>
    <Modal title="Tiếp nhận sửa chữa" open={formOpen} onCancel={()=>!saving&&setFormOpen(false)} footer={null} width={700} maskClosable={!saving} closable={!saving}>
      <Form form={form} layout="vertical" onFinish={create} disabled={saving}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'0 16px'}}>{[
          ['customerName','Họ tên',120],['customerPhone','Số điện thoại',20],['productName','Tên sản phẩm',255],['productBarcode','Barcode (nếu có)',100],
          ['frameCondition','Tình trạng gọng',1000],['lensCondition','Tình trạng tròng',1000],['reportedProblem','Khách báo lỗi',1000],['physicalCondition','Tình trạng bên ngoài khác',1000],
        ].map(([name,label,max])=><Form.Item key={name} name={name} label={label} rules={name==='productBarcode'?[]:[{required:true,whitespace:true,message:`Vui lòng nhập ${label.toLowerCase()}.`},...(name==='customerPhone'?[{pattern:/^[+]?[0-9 ()-]{7,20}$/,message:'Số điện thoại không hợp lệ.'}]:[])]}><Input maxLength={max}/></Form.Item>)}</div>
        <Form.Item name="requestedServices" label="Dịch vụ" rules={[{required:true,message:'Vui lòng chọn dịch vụ.'}]}><Select mode="multiple" aria-label="Dịch vụ sửa chữa" options={Object.entries(repairServices).map(([value,label])=>({value,label}))}/></Form.Item>
        <Form.Item name="expectedPickupAt" label="Hẹn trả" rules={[{required:true,message:'Vui lòng chọn giờ hẹn trả.'}]}><Input type="datetime-local" aria-label="Hẹn trả"/></Form.Item>
        <Form.Item name="customerNotes" label="Lưu ý của khách"><Input.TextArea rows={2} maxLength={1000}/></Form.Item>
        <Form.Item name="orderId" hidden><Input/></Form.Item>
        <Form.Item name="orderItemId" hidden><Input/></Form.Item>
        <Form.Item name="customerId" hidden><Input/></Form.Item>
        <Form.Item name="notes" hidden><Input/></Form.Item>
        <div className="workspace-actions" style={{justifyContent:'flex-end'}}><Button disabled={saving} onClick={()=>setFormOpen(false)}>Hủy</Button><Button type="primary" htmlType="submit" loading={saving}>Lưu & xem biên nhận</Button></div>
      </Form>
    </Modal>
    <Drawer title={activeClaim?.warrantyCode ? `Phiếu bảo hành #${activeClaim.warrantyCode}` : 'Chi tiết bảo hành'} open={activeClaimId!==null} onClose={()=>setActiveClaimId(null)} width={520}>{activeClaim&&<div className="simple-workspace workspace-detail">
      {(()=>{const meta=warrantyStatusMeta(activeClaim.status,activeClaim.statusLabel);return <Tag color={meta.color}>{meta.label}</Tag>;})()}
      <section><h2>{activeClaim.customerName}</h2><p>{activeClaim.customerPhone}</p><p>Sản phẩm: {activeClaim.productName}</p><p>Đơn gốc: {activeClaim.originalOrderCode || '—'}</p><p>Chính sách: {activeClaim.policyRef || benefitName(activeClaim.benefitType)}</p><p>Ngày gửi: {dateTime(activeClaim.createdAt)}</p></section>
      <section><h2>Mô tả tình trạng</h2><p>{activeClaim.issueDescription || 'Không có mô tả chi tiết'}</p></section>
      {activeClaim.deliveryMethod && <section><h2>Giao nhận kính</h2><p>Hình thức: {activeClaim.deliveryMethod==='DOOR'?'Giao nhận tận nơi':'Mang tới showroom'}</p><p>Showroom: {activeClaim.receivingBranchName || activeClaim.receivingBranchCode}</p>{activeClaim.receivingBranchAddress&&<p>Địa chỉ showroom: {activeClaim.receivingBranchAddress}</p>}{activeClaim.deliveryMethod==='DOOR'&&<p>Địa chỉ nhận / trả kính: {activeClaim.collectionAddress || 'Chưa có địa chỉ'}</p>}<p>Liên hệ: {activeClaim.customerPhone}</p></section>}
      <section><h2>Lịch sử xử lý</h2>{claimHistoryLoading?<p className="workspace-muted">Đang tải lịch sử…</p>:claimHistory.length===0?<p className="workspace-muted">Chưa có bản ghi lịch sử.</p>:claimHistory.map((h,idx)=><p key={h.id||idx}>{dateTime(h.changedAt)} · {warrantyStatuses[h.toStatus]||h.toStatus} · {h.changedBy || 'Hệ thống'}{h.note?` — ${h.note}`:''}</p>)}</section>
      <div className="workspace-actions">
        {nextWarrantyTransition(activeClaim.status)&&<Button type="primary" loading={saving} onClick={()=>updateClaimStatus(activeClaim,nextWarrantyTransition(activeClaim.status))}>{nextWarrantyTransition(activeClaim.status).actionLabel}</Button>}
        {['WAITING_PROCESS','IN_PROGRESS'].includes(String(activeClaim.status||'').toUpperCase())&&<Button danger loading={saving} onClick={()=>updateClaimStatus(activeClaim,{status:'REJECTED',statusLabel:'Từ chối',statusColor:'#dc2626'})}>Từ chối</Button>}
      </div>
    </div>}</Drawer>
    <Drawer title={active?.serviceCode || 'Phiếu sửa chữa'} open={activeId!==null} onClose={()=>setActiveId(null)} width={500}>{active&&<div className="simple-workspace workspace-detail">
      <Tag>{repairStatuses[active.status] || active.status}</Tag><section><h2>{active.customerName}</h2><p>{active.customerPhone}</p><p>{active.productName}</p><p>Hẹn trả: {dateTime(active.expectedPickupAt)}</p></section>
      <section><h2>Nội dung tiếp nhận</h2><p>{active.reportedProblem}</p><p>Gọng: {active.frameCondition}</p><p>Tròng: {active.lensCondition}</p><p>{active.physicalCondition}</p><p>Dịch vụ: {(active.requestedServices||[]).map(value=>repairServices[value]||value).join(', ')}</p></section>
      <details className="workspace-extra"><summary>Lịch sử xử lý</summary>{(active.statusHistory||[]).map((entry,index)=><p key={index}>{dateTime(entry.changedAt)} · {repairStatuses[entry.newStatus]||entry.newStatus} · {entry.changedBy}</p>)}</details>
      <div className="workspace-actions"><Button onClick={()=>setReceipt(active)}>In biên nhận</Button>{active.status!=='READY_FOR_PICKUP'&&active.status!=='COMPLETED'&&<Button type="primary" loading={saving} onClick={()=>updateRepair(active,'READY_FOR_PICKUP')}>Hoàn thành</Button>}</div>
    </div>}</Drawer>
    <RepairReceipt repair={receipt} open={!!receipt} onClose={()=>setReceipt(null)}/>
  </main>;
}
