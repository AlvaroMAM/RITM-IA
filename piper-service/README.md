# Piper local para RITM-IA

Servicio opcional de texto a voz. Se levanta con:

```powershell
docker compose --profile media up -d --build piper
```

Expone `POST /synthesize` en `http://localhost:5000/synthesize`.
