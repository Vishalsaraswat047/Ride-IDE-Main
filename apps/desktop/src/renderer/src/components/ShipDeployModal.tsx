import { useState, useEffect } from "react";
import { X, CheckCircle, CreditCard, Shield, Globe, Zap, ArrowRight, Loader2 } from "lucide-react";
import type { BillingPlan, ShipmentRecord } from "@ride/contracts";

interface ShipDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployContinue: () => void;
  projectRoot: string;
  projectName: string;
}

export function ShipDeployModal({ isOpen, onClose, onDeployContinue, projectRoot, projectName }: ShipDeployModalProps) {
  const [step, setStep] = useState<"ship" | "pay" | "success">("ship");
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RIDE Wallet");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlan();
      setStep("ship");
      setError(null);
    }
  }, [isOpen]);

  const loadPlan = async () => {
    try {
      const p = await window.ride.ship.plan();
      setPlan(p);
    } catch {
      setPlan(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "INR") {
      return `₹${(price / 100).toFixed(0)}`;
    }
    return `${currency} ${(price / 100).toFixed(2)}`;
  };

  const handleShipClick = () => {
    setStep("pay");
  };

  const handlePayClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const record = await window.ride.ship.record({
        projectRoot,
        projectName,
        paymentMethod,
      });
      if (record) {
        setStep("success");
      } else {
        setError("Failed to record shipment. Please try again.");
      }
    } catch (e) {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessContinue = () => {
    onClose();
    onDeployContinue();
  };

  if (!isOpen) return null;

  const priceDisplay = plan ? formatPrice(plan.price, plan.currency) : "₹99";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
      <div className="relative w-full max-w-md bg-canvas rounded-xl border border-hairline shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
          <h2 className="text-sm font-semibold text-body">
            {step === "ship" ? "Ship Your Project" : step === "pay" ? "Complete Payment" : "Payment Successful"}
          </h2>
          <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-mute hover:text-body hover:bg-canvas-soft transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === "ship" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-body">SHIP YOUR PROJECT</h3>
                  <p className="text-xs text-mute">Take this project from RIDE to production</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-body">Ship includes:</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green" /> One-time payment — no recurring fees</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green" /> Deployment unlocked for this project</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green" /> Code export unlocked</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green" /> Production dashboard unlocked</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green" /> Hostinger hosting & domain integration</li>
                </ul>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-hairline">
                <span className="text-sm font-medium text-body">Ship this project</span>
                <span className="text-lg font-bold text-body">{priceDisplay}</span>
              </div>

              <button
                onClick={handleShipClick}
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-on-primary font-medium text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" />
                Ship for {priceDisplay}
              </button>
            </div>
          )}

          {step === "pay" && plan && (
            <div className="space-y-4">
              <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-hairline">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mute">Project</span>
                  <span className="font-medium text-body truncate max-w-[180px]">{projectName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mute">Plan</span>
                  <span className="font-medium text-body">{plan.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mute">Amount</span>
                  <span className="font-bold text-body">{formatPrice(plan.price, plan.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mute">Payment method</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-7 rounded-sm border border-hairline bg-canvas px-2 text-sm text-body outline-none ride-focus-ring"
                  >
                    <option value="RIDE Wallet">RIDE Wallet</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red/10 border border-red/30 text-red text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handlePayClick}
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-on-primary font-medium text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {formatPrice(plan.price, plan.currency)}
                  </>
                )}
              </button>

              <p className="text-center text-xs text-mute flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />
                Secure payment — no card details stored
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-body">Payment Successful</h3>
                <p className="text-sm text-mute mt-1">Your project has been unlocked.</p>
              </div>
              <div className="p-3 rounded-lg bg-green/10 border border-green/30 text-green text-sm">
                ✓ Shipment recorded for <span className="font-medium">{projectName}</span>
              </div>
              <button
                onClick={handleSuccessContinue}
                className="w-full h-10 rounded-lg bg-primary text-on-primary font-medium text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              >
                <ArrowRight className="h-4 w-4" />
                Continue to Deployment
              </button>
              <p className="text-xs text-mute">You can now connect Hostinger hosting and configure your domain.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}