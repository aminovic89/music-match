# ================================================
# Music Match — GitFlow : règles de branches
# ================================================
#
# STRUCTURE :
#
#   feature/xxx  ──► develop  ──► release/x.x  ──► main
#                                                    │
#                                               hotfix/xxx
#
# RÈGLES :
#   - Ne jamais pusher directement sur main ou develop
#   - Toute feature part d'une branche feature/nom-de-la-feature
#   - Une PR doit passer les tests avant merge
#   - main = production stable uniquement
#   - develop = intégration continue → déploiement DEV auto
#
# COMMANDES UTILES :
#
# Démarrer une feature :
#   git checkout develop
#   git pull origin develop
#   git checkout -b feature/nom-de-la-feature
#
# Finir une feature (PR vers develop) :
#   git push origin feature/nom-de-la-feature
#   → Créer une Pull Request sur GitHub vers develop
#
# Démarrer une release :
#   git checkout develop
#   git checkout -b release/1.0.0
#   → Corriger les derniers bugs, bumper la version
#   → PR vers main ET develop
#
# Hotfix urgent en prod :
#   git checkout main
#   git checkout -b hotfix/description
#   → Fix → PR vers main ET develop
#
# ================================================
