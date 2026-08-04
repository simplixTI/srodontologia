export type DeliveryStatus =
  | 'pending' | 'preparing' | 'ready_for_pickup' | 'dispatched'
  | 'in_transit' | 'delivered' | 'problem';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Aguardando preparação',
  preparing: 'Preparando',
  ready_for_pickup: 'Pronto para retirada',
  dispatched: 'Despachado',
  in_transit: 'Em trânsito',
  delivered: 'Entregue',
  problem: 'Problema na entrega'
};

export type Delivery = {
  id: string;
  case_id: string;
  status: DeliveryStatus;
  method: string | null;
  carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  recipient_name: string | null;
  estimated_delivery_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
