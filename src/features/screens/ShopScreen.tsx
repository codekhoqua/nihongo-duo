import { useEffect, useState } from 'react';
import { useProgress } from '../../store';
import { useFocusTrap } from '../../lib/useFocusTrap';
import './screens.css';

const REFILL_COST = 350;

const GEM_PACKS = [
  { amount: 100, label: 'Gói nhỏ', note: 'Bắt đầu tích luỹ', badge: '' },
  { amount: 500, label: 'Gói vừa', note: 'Nhiều người chọn', badge: 'Phổ biến' },
  { amount: 1200, label: 'Gói lớn', note: 'Tiết kiệm nhất', badge: 'Tiết kiệm' },
];

export default function ShopScreen({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useProgress();
  const [toast, setToast] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const closeDemo = () => setShowDemo(false);
  const demoRef = useFocusTrap<HTMLDivElement>(showDemo, closeDemo);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const heartsFull = state.hearts >= state.maxHearts;
  const missingGems = REFILL_COST - state.gems;
  const refillReason = heartsFull
    ? 'Tim đang đầy, chưa cần nạp.'
    : missingGems > 0
      ? `Bạn còn thiếu ${missingGems} 💎 để nạp tim.`
      : null;

  function refillHearts() {
    dispatch({ type: 'refill-hearts', cost: REFILL_COST });
    setToast('Đã nạp đầy tim!');
  }

  function buyGems(amount: number) {
    dispatch({ type: 'buy-gems', amount });
    setToast(`Đã nhận ${amount} 💎 (bản demo)`);
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Quay lại">
          ←
        </button>
        <span className="screen-head__title">Cửa hàng</span>
        <span className="shop-balance" aria-label={`Số dư ${state.gems} kim cương`}>
          <span aria-hidden="true">💎</span>
          {state.gems}
        </span>
      </div>

      <section className="shop-card" aria-labelledby="shop-hearts-title">
        <div className="shop-card__head">
          <h2 className="shop-card__title" id="shop-hearts-title">
            ❤️ Tim của bạn
          </h2>
          <span className="pill pill--red">
            {state.hearts}/{state.maxHearts}
          </span>
        </div>
        <div className="hearts-row" aria-hidden="true">
          {Array.from({ length: state.maxHearts }, (_, index) => (
            <span key={index} className={index < state.hearts ? undefined : 'hearts-row__empty'}>
              {index < state.hearts ? '❤️' : '🖤'}
            </span>
          ))}
        </div>
        <p className="shop-hint">Mỗi lần trả lời sai sẽ mất một tim.</p>
        <button
          type="button"
          className="btn btn--primary btn--block"
          data-testid="shop-refill"
          disabled={heartsFull || missingGems > 0}
          onClick={refillHearts}
        >
          Nạp đầy {REFILL_COST} 💎
        </button>
        {refillReason && <p className="shop-reason">{refillReason}</p>}
      </section>

      <h2 className="section-title">Nạp kim cương</h2>
      <div className="gem-grid">
        {GEM_PACKS.map((pack) => (
          <button
            key={pack.amount}
            type="button"
            className="gem-pack"
            onClick={() => buyGems(pack.amount)}
          >
            <span className="gem-pack__icon" aria-hidden="true">
              💎
            </span>
            <span className="gem-pack__body">
              <span className="gem-pack__amount">
                {pack.amount} kim cương
              </span>
              <span className="gem-pack__price">
                {pack.label} · {pack.note}
              </span>
            </span>
            {pack.badge && <span className="gem-pack__badge">{pack.badge}</span>}
          </button>
        ))}
      </div>

      <button type="button" className="offer-card" onClick={() => setShowDemo(true)}>
        <span className="offer-card__icon" aria-hidden="true">
          🎁
        </span>
        <span className="grow">
          <span className="offer-card__title">Gói ưu đãi đặc biệt</span>
          <span className="offer-card__desc">Nhận gấp đôi kim cương — chỉ trong tuần này</span>
        </span>
        <span className="pill pill--yellow">Xem</span>
      </button>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {showDemo && (
        <div className="modal-backdrop" onClick={closeDemo}>
          <div
            ref={demoRef}
            className="modal modal--with-close"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="icon-btn modal__close"
              aria-label="Đóng"
              onClick={closeDemo}
            >
              ✕
            </button>
            <div className="modal__emoji" aria-hidden="true">
              🎁
            </div>
            <h2 className="h2" id="demo-modal-title">
              Tính năng demo
            </h2>
            <p className="modal__text">
              Gói ưu đãi và thanh toán thật chưa mở trong bản demo. Bạn vẫn có thể thử nạp kim cương
              miễn phí ở phía trên.
            </p>
            <div className="modal__actions">
              <button type="button" className="btn btn--primary btn--block" onClick={closeDemo}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
