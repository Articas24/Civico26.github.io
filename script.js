// =================================
// MENU A SCOMPARSA
// CIVICO 26
// =================================


const accordionHeaders =
    document.querySelectorAll(
        ".accordion-header"
    );


accordionHeaders.forEach(
    function(header) {

        header.addEventListener(
            "click",
            function() {


                // Troviamo la sezione
                // attualmente cliccata

                const currentItem =
                    header.parentElement;


                // Controlliamo se è già aperta

                const isAlreadyOpen =
                    currentItem.classList.contains(
                        "active"
                    );


                // Chiudiamo tutte
                // le sezioni aperte

                document
                    .querySelectorAll(
                        ".accordion-item.active"
                    )
                    .forEach(
                        function(item) {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                // Se la sezione cliccata
                // era chiusa, la apriamo

                if (!isAlreadyOpen) {

                    currentItem.classList.add(
                        "active"
                    );

                }

            }
        );

    }
);