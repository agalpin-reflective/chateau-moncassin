# Clé publique de la banque

Déposer ici `etransactions-pubkey.pem`, la clé publique d'Up2pay e-Transactions qui signe les notifications de paiement.
Elle est fournie par le Crédit Agricole (archive du module PHP, fichier `pubkey.pem`). C'est une clé publique : elle peut être versionnée.

Sans ce fichier (ou la variable `ETRANSACTIONS_PUBLIC_KEY`), l'API rejette toutes les notifications et aucune commande ne passe à « payée ».
