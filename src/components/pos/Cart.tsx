// ... (le reste du code reste identique jusqu'à la partie du footer)

        {/* Footer - toujours visible */}
        <div className="mt-auto border-t border-border/50 bg-secondary/30 shrink-0">
          {/* Section client - réduite */}
          <div className="p-2 border-b border-border/50">
            <div className="flex gap-2 mb-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1 text-xs h-7"
                onClick={() => setShowAddCustomer(true)}
              >
                <UserPlus className="w-3 h-3" />
                <span className="truncate">Nouveau client</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1 text-xs h-7"
                onClick={() => setShowScanner(true)}
              >
                <ScanLine className="w-3 h-3" />
                <span className="truncate">Scanner</span>
              </Button>
            </div>
            <div className="max-h-[80px] overflow-y-auto">
              <CustomerLoyalty 
                onCustomerSelected={setSelectedCustomer} 
                selectedCustomer={selectedCustomer} 
              />
            </div>
          </div>
          
          {/* Zone de paiement - toujours visible et compacte */}
          <div className="p-2 space-y-2">
            <div className="space-y-1">
              {/* Total réduit */}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-card-foreground">{total.toFixed(2)} ₾</span>
              </div>
              
              {/* Boutons d'action principaux */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDiscountDialog(true)}
                  className="h-8 text-xs justify-center"
                  disabled={cart.length === 0}
                >
                  <Percent className="w-3 h-3 mr-1" />
                  Réduction
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => applyDiscountToItems(0, true)}
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  disabled={cart.length === 0 || itemDiscounts === 0}
                >
                  Annuler
                </Button>
              </div>
              
              {/* Bouton de paiement principal - TOUJOURS VISIBLE */}
              <Button 
                onClick={handlePaymentMethodClick} 
                disabled={processing || cart.length === 0}
                className="w-full h-10 bg-[#F5A623] hover:bg-[#E09612] text-white transition-colors text-sm font-semibold rounded-lg shadow-md"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Payer maintenant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Méthode de paiement - seulement quand activée */}
      {showPaymentMethod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-card rounded-lg p-4 w-full max-w-sm">
            <p className="text-sm font-medium text-center mb-3">
              Choisir le mode de paiement
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleCashPayment} 
                disabled={processing}
                className="h-14 flex-col gap-1 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all"
                variant="outline"
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-semibold">Espèces</span>
              </Button>
              <Button 
                onClick={handleCardPayment} 
                disabled={processing}
                className="h-14 flex-col gap-1 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all"
                variant="outline"
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-semibold">Carte</span>
              </Button>
            </div>
            <Button 
              onClick={() => setShowPaymentMethod(false)} 
              variant="ghost" 
              className="w-full mt-3 h-8 text-xs"
              disabled={processing}
            >
              Retour
            </Button>
          </div>
        </div>
      )}
      
      {/* Dialogs */}
      <DiscountDialog 
        open={showDiscountDialog} 
        onClose={() => setShowDiscountDialog(false)} 
        onApply={applyDiscountToItems}
        hasSelection={selectedItems.length > 0}
      />
    </>
  );
};

export default Cart;