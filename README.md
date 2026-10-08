# atlas-avis-bff



## Stack
- Langage : ${{ values.language }}
- CI/CD : Tekton → Harbor → ArgoCD
- Plateforme : DxP

## Démarrage rapide
```bash
# Cloner le repo
git clone <repo-url>
cd atlas-avis-bff

# Lancer en local
docker build -t atlas-avis-bff .
docker run -p 8080:8080 atlas-avis-bff
```
