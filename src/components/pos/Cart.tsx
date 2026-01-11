// Correction des problèmes spécifiques
// 1. Supprimer le bouton avec la croix
// 2. Réparer le bouton entouré "Discount"
// 3. Réduire la taille du panier pour rendre le bouton jaune visible

// Je dois modifier la partie spécifique où ces problèmes se produisent

// Dans la bannière de modification, supprimer le bouton X complètement
// Remplacer cette partie :
/*
{isModifyingOrder && originalOrder && (
  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/50">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Modif. #{originalOrder.orderNumber}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={cancelOrderModification}
        className="h-6 w-6 text-amber-500"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
    <p className="text-[10px] text-muted-foreground mt-1">
      Original: {originalOrder.originalTotal.toFixed(2)} ₾
    </p>
  </div>
)}
*/

// Par cette version sans le bouton X :
{isModifyingOrder && originalOrder && (
  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/50">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-500" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
        Modif. #{originalOrder.orderNumber}
      </span>
    </div>
    <p className="text-[10px] text-muted-foreground mt-1">
      Original: {originalOrder.originalTotal.toFixed(2)} ₾
    </p>
  </div>
)}

// Réduire la hauteur maximale du panier pour que le bouton jaune soit visible
// Ajouter une classe de hauteur personnalisée au ScrollArea principal
<ScrollArea className="flex-1 max-h-[60vh]">
  {/* Contenu du panier */}
</ScrollArea>

// Et pour le footer, s'assurer qu'il reste visible
<div className="mt-auto border-t border-border/50 bg-secondary/30 shrink-0 min-h-[200px]">
  {/* Contenu du footer */}
</div>