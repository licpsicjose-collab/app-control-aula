<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Control de Aula - Inicio</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            text-align: center;
            background-color: #f0f4f8;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: #333;
        }
        .container {
            background: white;
            padding: 40px 30px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            max-width: 400px;
            width: 90%;
            box-sizing: border-box;
        }
        h1 {
            margin-bottom: 5px;
            color: #007bff;
            font-size: 28px;
        }
        p {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .btn-acceso {
            display: block;
            width: 100%;
            padding: 15px;
            margin: 15px 0;
            font-size: 16px;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-sizing: border-box;
            text-decoration: none;
        }
        .docente {
            background-color: #007bff;
            color: white;
        }
        .docente:hover {
            background-color: #0056b3;
            transform: translateY(-2px);
        }
        .alumno {
            background-color: #28a745;
            color: white;
        }
        .alumno:hover {
            background-color: #1e7e34;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>

<div class="container">
    <h1>🚀 Control de Aula</h1>
    <p>Selecciona tu rol para ingresar al sistema</p>

    <button class="btn-acceso docente" onclick="irADocente()">👨‍🏫 Entrar como Docente</button>
    <button class="btn-acceso alumno" onclick="irAAlumno()">👨‍🎓 Entrar como Alumno</button>
</div>

<script>
function irADocente(){
    // Redirige a la pantalla de inicio de sesión del profesor
    window.location.href = "login.html";
}

function irAAlumno(){
    // Redirige directamente al panel de ingreso por código
    window.location.href = "panel-alumno.html";
}
</script>

</body>
</html>
