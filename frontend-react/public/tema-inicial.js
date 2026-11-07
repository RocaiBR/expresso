// Aplica o tema salvo antes de a página aparecer (evita piscar no claro).
// Em arquivo próprio porque a política de segurança do site não permite script dentro do HTML.
try {
    var tema = localStorage.getItem("tema");
    if (tema === "claro" || tema === "escuro" || tema === "profundo") {
        document.documentElement.dataset.tema = tema;
    }
} catch (erro) {}
