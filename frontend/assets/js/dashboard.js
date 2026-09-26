/* =====================================================
   DASHBOARD
===================================================== */

document.addEventListener("DOMContentLoaded", function () {


    /* =================================================
       ABAS
    ================================================== */

    const abas = document.querySelectorAll(".aba");


    abas.forEach(function (aba) {


        aba.addEventListener("click", function () {


            /* Remove o ativo de todas */

            abas.forEach(function (item) {

                item.classList.remove("ativa");

            });


            /* Coloca ativo na aba clicada */

            aba.classList.add("ativa");


        });

    });



    /* =================================================
       PESQUISA
    ================================================== */

    const pesquisa =
        document.querySelector(".pesquisa input");


    const atividades =
        document.querySelectorAll(".atividade");



    if (pesquisa) {


        pesquisa.addEventListener(
            "input",
            function () {


                const texto =
                    pesquisa.value
                        .toLowerCase()
                        .trim();



                atividades.forEach(
                    function (atividade) {


                        const conteudo =
                            atividade.textContent
                                .toLowerCase();



                        if (
                            conteudo.includes(texto)
                        ) {

                            atividade.style.display =
                                "grid";

                        } else {

                            atividade.style.display =
                                "none";

                        }


                    }
                );


            }
        );


    }


});

function gerarCalendario() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0 = Janeiro, 8 = Setembro...
    const diaAtual = hoje.getDate();

    // Nome dos meses em português
    const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    // Atualiza o título (Ex: "setembro de 2026")
    document.getElementById('cal-month-year').textContent = `${meses[mesAtual]} de ${anoAtual}`;

    // Descobre em qual dia da semana o mês começa (0 = Domingo, 1 = Segunda...)
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

    // Descobre o total de dias que o mês atual possui
    const totalDiasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

    const gridDias = document.getElementById('cal-days-grid');
    gridDias.innerHTML = '';

    // Adiciona os espaços em branco antes do 1º dia do mês
    for (let i = 0; i < primeiroDiaSemana; i++) {
        const spanVazio = document.createElement('span');
        gridDias.appendChild(spanVazio);
    }

    // Preenche os dias do mês
    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
        const spanDia = document.createElement('span');
        spanDia.textContent = dia;

        // Destaca o dia de HOJE
        if (dia === diaAtual) {
            spanDia.className = "bg-[#6F0049] text-white rounded-full flex items-center justify-center w-5 h-5 2xl:w-6 2xl:h-6 mx-auto font-medium";
        }

        gridDias.appendChild(spanDia);
    }
}

// Executa assim que a página carregar
document.addEventListener('DOMContentLoaded', gerarCalendario);