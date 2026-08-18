



"use strict";

/* =========================================================
   HR MATKA BACKEND
   COMPLETE REPLACEMENT
   PART 1 OF 2 - SERVER.JS

   PART 1:
   - Core helpers
   - Secure source fetch
   - Date handling
   - HTML table parser
   - Historical chart parser
   - 2026 filtering
   - Two-source historical verification

   IMPORTANT:
   Historical source data is READ-ONLY.
   Historical records do not perform settlement.
========================================================= */

const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = 5000;


/* =========================================================
   APPROVED SOURCE HOSTS
========================================================= */

const ALLOWED_HOSTS = new Set([

    "dpbossss.boston",
    "www.dpbossss.boston",

    "sattamatkadpboss.mobi",
    "www.sattamatkadpboss.mobi",

    "spmatka.net",
    "www.spmatka.net",

    "mail.spmatka.net"

]);


/* =========================================================
   BASIC TEXT HELPERS
========================================================= */

function cleanText(value){

    return String(
        value ?? ""
    )
    .replace(
        /\u00a0/g,
        " "
    )
    .replace(
        /\r/g,
        " "
    )
    .replace(
        /\n/g,
        " "
    )
    .replace(
        /\t/g,
        " "
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}


function upper(value){

    return cleanText(
        value
    )
    .toUpperCase();

}


function digitsOnly(value){

    return String(
        value ?? ""
    )
    .replace(
        /\D/g,
        ""
    );

}


function normalizeMarketName(value){

    return upper(
        value
    )
    .replace(
        /[^A-Z0-9]+/g,
        " "
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}


/* =========================================================
   RESULT VALUE VALIDATORS
========================================================= */

function validPanel(value){

    return /^\d{3}$/.test(
        cleanText(
            value
        )
    );

}


function validJodi(value){

    return /^\d{2}$/.test(
        cleanText(
            value
        )
    );

}


function validSingle(value){

    return /^\d$/.test(
        cleanText(
            value
        )
    );

}


/* =========================================================
   PANEL -> SINGLE
========================================================= */

function calculateSingle(panel){

    const value =
    digitsOnly(
        panel
    );


    if(
        !/^\d{3}$/.test(
            value
        )
    ){

        return "";

    }


    let total =
    0;


    for(
        const digit of value
    ){

        total +=
        Number(
            digit
        );

    }


    return String(
        total % 10
    );

}


/* =========================================================
   HTML ENTITY DECODE
========================================================= */

function decodeHtml(value){

    return String(
        value ?? ""
    )
    .replace(
        /&nbsp;/gi,
        " "
    )
    .replace(
        /&#160;/gi,
        " "
    )
    .replace(
        /&amp;/gi,
        "&"
    )
    .replace(
        /&quot;/gi,
        '"'
    )
    .replace(
        /&#39;/gi,
        "'"
    )
    .replace(
        /&lt;/gi,
        "<"
    )
    .replace(
        /&gt;/gi,
        ">"
    )
    .replace(
        /&#x2F;/gi,
        "/"
    )
    .replace(
        /&#47;/gi,
        "/"
    );

}


/* =========================================================
   HTML -> CLEAN TEXT
========================================================= */

function stripTags(value){

    let html =
    String(
        value ?? ""
    );


    html =
    html
    .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
    )
    .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
    )
    .replace(
        /<br\b[^>]*>/gi,
        " "
    )
    .replace(
        /<\/p>/gi,
        " "
    )
    .replace(
        /<\/div>/gi,
        " "
    )
    .replace(
        /<\/span>/gi,
        " "
    )
    .replace(
        /<[^>]+>/g,
        " "
    );


    return cleanText(
        decodeHtml(
            html
        )
    );

}


/* =========================================================
   JSON RESPONSE
========================================================= */

function sendJson(
    res,
    statusCode,
    data
){

    const output =
    JSON.stringify(
        data
    );


    res.writeHead(
        statusCode,
        {

            "Content-Type":
            "application/json; charset=utf-8",

            "Access-Control-Allow-Origin":
            "*",

            "Access-Control-Allow-Methods":
            "GET,POST,OPTIONS",

            "Access-Control-Allow-Headers":
            "Content-Type",

            "Cache-Control":
            "no-store"

        }
    );


    res.end(
        output
    );

}


/* =========================================================
   REQUEST JSON BODY
========================================================= */

function readJsonBody(req){

    return new Promise(
        function(resolve,reject){

            let body =
            "";

            let finished =
            false;


            req.on(
                "data",
                function(chunk){

                    if(
                        finished
                    ){

                        return;

                    }


                    body +=
                    chunk.toString();


                    if(
                        body.length >
                        1024 * 1024
                    ){

                        finished =
                        true;


                        reject(
                            new Error(
                                "Request too large"
                            )
                        );


                        req.destroy();

                    }

                }
            );


            req.on(
                "end",
                function(){

                    if(
                        finished
                    ){

                        return;

                    }


                    finished =
                    true;


                    if(
                        !body
                    ){

                        resolve(
                            {}
                        );

                        return;

                    }


                    try{

                        resolve(
                            JSON.parse(
                                body
                            )
                        );

                    }
                    catch(error){

                        reject(
                            new Error(
                                "Invalid JSON body"
                            )
                        );

                    }

                }
            );


            req.on(
                "error",
                function(error){

                    if(
                        finished
                    ){

                        return;

                    }


                    finished =
                    true;


                    reject(
                        error
                    );

                }
            );

        }
    );

}


/* =========================================================
   URL VALIDATION
========================================================= */

function validateSourceUrl(value){

    let parsed;


    try{

        parsed =
        new URL(
            cleanText(
                value
            )
        );

    }
    catch(error){

        throw new Error(
            "Invalid Source URL"
        );

    }


    if(
        parsed.protocol !==
        "https:"
    ){

        throw new Error(
            "Only HTTPS URL Allowed"
        );

    }


    const host =
    parsed.hostname
    .toLowerCase();


    if(
        !ALLOWED_HOSTS.has(
            host
        )
    ){

        throw new Error(
            "Source Domain Not Allowed"
        );

    }


    return parsed.toString();

}


/* =========================================================
   SERVER SIDE HTML FETCH

   Browser CORS does not apply here.
========================================================= */

function fetchHtml(
    url,
    redirectCount
){

    redirectCount =
    Number(
        redirectCount || 0
    );


    return new Promise(
        function(resolve,reject){

            if(
                redirectCount > 5
            ){

                reject(
                    new Error(
                        "Too many redirects"
                    )
                );

                return;

            }


            let safeUrl;


            try{

                safeUrl =
                validateSourceUrl(
                    url
                );

            }
            catch(error){

                reject(
                    error
                );

                return;

            }


            const options = {

                headers:{

                    "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    +
                    "AppleWebKit/537.36 "
                    +
                    "Chrome/140 Safari/537.36",

                    "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                    "Accept-Language":
                    "en-IN,en-US;q=0.9,en;q=0.8",

                    "Cache-Control":
                    "no-cache",

                    "Pragma":
                    "no-cache"

                },

                timeout:
                20000

            };


            let completed =
            false;


            const request =
            https.get(
                safeUrl,
                options,
                function(response){

                    /* =====================================
                       REDIRECT
                    ===================================== */

                    if(
                        response.statusCode >= 300
                        &&
                        response.statusCode < 400
                        &&
                        response.headers.location
                    ){

                        let nextUrl;


                        try{

                            nextUrl =
                            new URL(
                                response.headers.location,
                                safeUrl
                            )
                            .toString();

                        }
                        catch(error){

                            response.resume();


                            if(
                                !completed
                            ){

                                completed =
                                true;


                                reject(
                                    new Error(
                                        "Invalid redirect URL"
                                    )
                                );

                            }


                            return;

                        }


                        response.resume();


                        fetchHtml(
                            nextUrl,
                            redirectCount + 1
                        )
                        .then(
                            function(html){

                                if(
                                    completed
                                ){

                                    return;

                                }


                                completed =
                                true;

                                resolve(
                                    html
                                );

                            }
                        )
                        .catch(
                            function(error){

                                if(
                                    completed
                                ){

                                    return;

                                }


                                completed =
                                true;

                                reject(
                                    error
                                );

                            }
                        );


                        return;

                    }


                    /* =====================================
                       HTTP STATUS
                    ===================================== */

                    if(
                        response.statusCode !== 200
                    ){

                        const status =
                        response.statusCode;


                        response.resume();


                        if(
                            !completed
                        ){

                            completed =
                            true;


                            reject(
                                new Error(
                                    "HTTP "
                                    +
                                    status
                                )
                            );

                        }


                        return;

                    }


                    let html =
                    "";


                    response.setEncoding(
                        "utf8"
                    );


                    response.on(
                        "data",
                        function(chunk){

                            if(
                                completed
                            ){

                                return;

                            }


                            html +=
                            chunk;


                            if(
                                Buffer.byteLength(
                                    html,
                                    "utf8"
                                )
                                >
                                8 * 1024 * 1024
                            ){

                                completed =
                                true;


                                request.destroy();


                                reject(
                                    new Error(
                                        "Source page too large"
                                    )
                                );

                            }

                        }
                    );


                    response.on(
                        "end",
                        function(){

                            if(
                                completed
                            ){

                                return;

                            }


                            completed =
                            true;


                            resolve(
                                html
                            );

                        }
                    );

                }
            );


            request.on(
                "timeout",
                function(){

                    if(
                        completed
                    ){

                        return;

                    }


                    completed =
                    true;


                    request.destroy();


                    reject(
                        new Error(
                            "Source request timeout"
                        )
                    );

                }
            );


            request.on(
                "error",
                function(error){

                    if(
                        completed
                    ){

                        return;

                    }


                    completed =
                    true;


                    reject(
                        error
                    );

                }
            );

        }
    );

}


/* =========================================================
   SAFE DATE CREATOR
========================================================= */

function createSafeDate(
    day,
    month,
    year
){

    day =
    Number(
        day
    );


    month =
    Number(
        month
    );


    year =
    Number(
        year
    );


    if(
        !Number.isInteger(
            day
        )
        ||
        !Number.isInteger(
            month
        )
        ||
        !Number.isInteger(
            year
        )
    ){

        return null;

    }


    /*
       18 -> 2018
       20 -> 2020
       26 -> 2026
    */

    if(
        year >= 0
        &&
        year < 100
    ){

        year +=
        2000;

    }


    const date =
    new Date(
        year,
        month - 1,
        day
    );


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return null;

    }


    if(
        date.getFullYear() !==
        year
        ||
        date.getMonth() !==
        month - 1
        ||
        date.getDate() !==
        day
    ){

        return null;

    }


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


/* =========================================================
   DD/MM/YYYY
   DD-MM-YYYY
   DD/MM/YY
   DD-MM-YY
========================================================= */

function parseDate(value){

    const raw =
    cleanText(
        value
    );


    const match =
    raw.match(
        /(^|\D)(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}|\d{2})(?!\d)/
    );


    if(
        !match
    ){

        return null;

    }


    return createSafeDate(

        match[2],

        match[3],

        match[4]

    );

}


/* =========================================================
   API DATE

   YYYY-MM-DD
   DD/MM/YYYY
   DD-MM-YYYY
========================================================= */

function parseApiDate(value){

    const raw =
    cleanText(
        value
    );


    if(
        !raw
    ){

        return null;

    }


    const iso =
    raw.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );


    if(
        iso
    ){

        return createSafeDate(

            iso[3],

            iso[2],

            iso[1]

        );

    }


    return parseDate(
        raw
    );

}


/* =========================================================
   DATE -> DD/MM/YYYY
========================================================= */

function formatDate(date){

    if(
        !(date instanceof Date)
        ||
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";

    }


    const day =
    String(
        date.getDate()
    )
    .padStart(
        2,
        "0"
    );


    const month =
    String(
        date.getMonth() + 1
    )
    .padStart(
        2,
        "0"
    );


    return (
        day
        +
        "/"
        +
        month
        +
        "/"
        +
        date.getFullYear()
    );

}


/* =========================================================
   ADD DAYS
========================================================= */

function addDays(
    date,
    numberOfDays
){

    const output =
    new Date(
        date.getTime()
    );


    output.setDate(
        output.getDate()
        +
        Number(
            numberOfDays || 0
        )
    );


    output.setHours(
        0,
        0,
        0,
        0
    );


    return output;

}


/* =========================================================
   START OF DAY
========================================================= */

function startOfDay(date){

    const output =
    new Date(
        date
    );


    output.setHours(
        0,
        0,
        0,
        0
    );


    return output;

}


/* =========================================================
   RANGE CHECK
========================================================= */

function inRange(
    date,
    fromDate,
    toDate
){

    if(
        !(date instanceof Date)
        ||
        !(fromDate instanceof Date)
        ||
        !(toDate instanceof Date)
    ){

        return false;

    }


    const value =
    startOfDay(
        date
    )
    .getTime();


    const from =
    startOfDay(
        fromDate
    )
    .getTime();


    const to =
    startOfDay(
        toDate
    )
    .getTime();


    return (
        value >= from
        &&
        value <= to
    );

}


/* =========================================================
   DEFAULT HISTORICAL RANGE
========================================================= */

function defaultHistoryFrom(){

    return new Date(
        2026,
        0,
        1
    );

}


function defaultHistoryTo(){

    const now =
    new Date();


    now.setHours(
        0,
        0,
        0,
        0
    );


    return now;

}


/* =========================================================
   PANEL NORMALIZATION

   Examples:
   1 7 8 -> 178
   178   -> 178
========================================================= */

function normalizePanel(value){

    const raw =
    cleanText(
        value
    );


    if(
        !raw
        ||
        raw.includes(
            "*"
        )
    ){

        return "";

    }


    const digits =
    digitsOnly(
        raw
    );


    if(
        digits.length !== 3
    ){

        return "";

    }


    return digits;

}


/* =========================================================
   JODI NORMALIZATION
========================================================= */

function normalizeJodi(value){

    const raw =
    cleanText(
        value
    );


    if(
        !raw
        ||
        raw.includes(
            "*"
        )
    ){

        return "";

    }


    const digits =
    digitsOnly(
        raw
    );


    if(
        digits.length === 1
    ){

        return digits
        .padStart(
            2,
            "0"
        );

    }


    if(
        digits.length === 2
    ){

        return digits;

    }


    return "";

}


/* =========================================================
   TABLE ROW EXTRACTOR

   Result:
   [
       ["DATE","MON","TUE",...],
       ["10/08/2026 to 16/08/2026", "...", ...]
   ]
========================================================= */

function extractTableRows(html){

    const rows =
    [];


    const source =
    String(
        html ?? ""
    );


    const rowRegex =
    /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;


    let rowMatch;


    while(
        (
            rowMatch =
            rowRegex.exec(
                source
            )
        )
        !==
        null
    ){

        const rowHtml =
        rowMatch[1];


        const cells =
        [];


        const cellRegex =
        /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;


        let cellMatch;


        while(
            (
                cellMatch =
                cellRegex.exec(
                    rowHtml
                )
            )
            !==
            null
        ){

            cells.push(
                stripTags(
                    cellMatch[2]
                )
            );

        }


        if(
            cells.length
        ){

            rows.push(
                cells
            );

        }

    }


    return rows;

}


/* =========================================================
   WEEK RANGE

   Supports:
   26/02/18 to 04/03/18
   10/08/2026 to 16/08/2026
========================================================= */

function parseWeekRange(value){

    const raw =
    cleanText(
        value
    );


    const matches =
    raw.match(
        /\d{1,2}[\/\-]\d{1,2}[\/\-](?:\d{4}|\d{2})(?!\d)/g
    );


    if(
        !matches
        ||
        !matches.length
    ){

        return null;

    }


    const start =
    parseDate(
        matches[0]
    );


    if(
        !start
    ){

        return null;

    }


    let end =
    addDays(
        start,
        6
    );


    if(
        matches.length >= 2
    ){

        const parsedEnd =
        parseDate(
            matches[1]
        );


        if(
            parsedEnd
        ){

            end =
            parsedEnd;

        }

    }


    return{

        start:
        start,

        end:
        end

    };

}


/* =========================================================
   PARSE ONE DAILY RESULT CELL

   SUPPORTED CURRENT SOURCE FORMATS:

   178-61-399

   178 61 399

   1 7 8 61 3 9 9

   1
   7
   8
   61
   3
   9
   9

========================================================= */

function parseDailyResultCell(value){

    const raw =
    cleanText(
        value
    );


    if(
        !raw
        ||
        raw === "-"
        ||
        raw === "--"
        ||
        upper(
            raw
        )
        .includes(
            "HOLIDAY"
        )
    ){

        return null;

    }


    /* =====================================================
       STAR / CLOSED DAY
    ===================================================== */

    const withoutStars =
    raw
    .replace(
        /\*/g,
        ""
    )
    .trim();


    if(
        !withoutStars
    ){

        return null;

    }


    /* =====================================================
       FORMAT:
       178-61-399
       178 61 399
    ===================================================== */

    const compact =
    raw.match(
        /(?:^|\D)(\d{3})\D+(\d{2})\D+(\d{3})(?:\D|$)/
    );


    if(
        compact
    ){

        const openPanel =
        compact[1];


        const jodi =
        compact[2];


        const closePanel =
        compact[3];


        if(
            validPanel(
                openPanel
            )
            &&
            validJodi(
                jodi
            )
            &&
            validPanel(
                closePanel
            )
        ){

            return{

                openPanel:
                openPanel,

                openSingle:
                calculateSingle(
                    openPanel
                ),

                jodi:
                jodi,

                closeSingle:
                calculateSingle(
                    closePanel
                ),

                closePanel:
                closePanel,

                complete:
                true

            };

        }

    }


    /* =====================================================
       CURRENT DPBOSS CELL STYLE

       1 7 8 61 3 9 9
    ===================================================== */

    const tokens =
    raw.match(
        /\d+/g
    )
    ||
    [];


    if(
        tokens.length >= 7
    ){

        const firstThree =
        tokens.slice(
            0,
            3
        );


        if(
            firstThree.every(
                function(token){

                    return /^\d$/.test(
                        token
                    );

                }
            )
        ){

            const openPanel =
            firstThree.join(
                ""
            );


            const jodiToken =
            tokens[3];


            const closeThree =
            tokens.slice(
                4,
                7
            );


            if(
                /^\d{1,2}$/.test(
                    jodiToken
                )
                &&
                closeThree.length === 3
                &&
                closeThree.every(
                    function(token){

                        return /^\d$/.test(
                            token
                        );

                    }
                )
            ){

                const jodi =
                jodiToken
                .padStart(
                    2,
                    "0"
                );


                const closePanel =
                closeThree.join(
                    ""
                );


                if(
                    validPanel(
                        openPanel
                    )
                    &&
                    validJodi(
                        jodi
                    )
                    &&
                    validPanel(
                        closePanel
                    )
                ){

                    return{

                        openPanel:
                        openPanel,

                        openSingle:
                        calculateSingle(
                            openPanel
                        ),

                        jodi:
                        jodi,

                        closeSingle:
                        calculateSingle(
                            closePanel
                        ),

                        closePanel:
                        closePanel,

                        complete:
                        true

                    };

                }

            }

        }

    }


    /* =====================================================
       POSSIBLE THREE-TOKEN FORMAT:

       178 | 61 | 399
    ===================================================== */

    if(
        tokens.length >= 3
        &&
        /^\d{3}$/.test(
            tokens[0]
        )
        &&
        /^\d{1,2}$/.test(
            tokens[1]
        )
        &&
        /^\d{3}$/.test(
            tokens[2]
        )
    ){

        const openPanel =
        tokens[0];


        const jodi =
        tokens[1]
        .padStart(
            2,
            "0"
        );


        const closePanel =
        tokens[2];


        return{

            openPanel:
            openPanel,

            openSingle:
            calculateSingle(
                openPanel
            ),

            jodi:
            jodi,

            closeSingle:
            calculateSingle(
                closePanel
            ),

            closePanel:
            closePanel,

            complete:
            true

        };

    }


    /* =====================================================
       OPEN PANEL ONLY
    ===================================================== */

    const panel =
    normalizePanel(
        raw
    );


    if(
        validPanel(
            panel
        )
    ){

        return{

            openPanel:
            panel,

            openSingle:
            calculateSingle(
                panel
            ),

            jodi:
            "",

            closeSingle:
            "",

            closePanel:
            "",

            complete:
            false

        };

    }


    /* =====================================================
       SPACED OPEN PANEL ONLY:
       1 7 8
    ===================================================== */

    if(
        tokens.length === 3
        &&
        tokens.every(
            function(token){

                return /^\d$/.test(
                    token
                );

            }
        )
    ){

        const openPanel =
        tokens.join(
            ""
        );


        return{

            openPanel:
            openPanel,

            openSingle:
            calculateSingle(
                openPanel
            ),

            jodi:
            "",

            closeSingle:
            "",

            closePanel:
            "",

            complete:
            false

        };

    }


    return null;

}


/* =========================================================
   PARSE THREE SEPARATE CELLS

   OPEN PANEL | JODI | CLOSE PANEL
========================================================= */

function parseSplitDay(
    openValue,
    jodiValue,
    closeValue
){

    const openPanel =
    normalizePanel(
        openValue
    );


    if(
        !validPanel(
            openPanel
        )
    ){

        return null;

    }


    const jodi =
    normalizeJodi(
        jodiValue
    );


    const closePanel =
    normalizePanel(
        closeValue
    );


    return{

        openPanel:
        openPanel,

        openSingle:
        calculateSingle(
            openPanel
        ),

        jodi:
        jodi,

        closeSingle:
        validPanel(
            closePanel
        )
        ?
        calculateSingle(
            closePanel
        )
        :
        "",

        closePanel:
        closePanel,

        complete:
        validPanel(
            closePanel
        )

    };

}


/* =========================================================
   HISTORICAL RECORD CREATOR

   READ ONLY:
   settlementAllowed = false
========================================================= */

function createHistoricalRecord(
    market,
    date,
    openPanel,
    jodi,
    closePanel,
    source,
    sourceUrl
){

    const normalizedMarket =
    cleanText(
        market
    );


    const open =
    normalizePanel(
        openPanel
    );


    const close =
    normalizePanel(
        closePanel
    );


    let pair =
    normalizeJodi(
        jodi
    );


    if(
        !normalizedMarket
        ||
        !(date instanceof Date)
        ||
        !validPanel(
            open
        )
    ){

        return null;

    }


    const openSingle =
    calculateSingle(
        open
    );


    let closeSingle =
    "";


    let status =
    "OPEN";


    let resultText =
    open
    +
    "-"
    +
    openSingle
    +
    "*-***";


    if(
        validPanel(
            close
        )
    ){

        closeSingle =
        calculateSingle(
            close
        );


        const calculatedJodi =
        openSingle
        +
        closeSingle;


        /*
           If source jodi missing,
           calculate it from panels.
        */

        if(
            !validJodi(
                pair
            )
        ){

            pair =
            calculatedJodi;

        }


        resultText =
        open
        +
        "-"
        +
        pair
        +
        "-"
        +
        close;


        status =
        "COMPLETE";

    }


    const dateText =
    formatDate(
        date
    );


    const safeMarketId =
    normalizeMarketName(
        normalizedMarket
    )
    .replace(
        /\s+/g,
        "-"
    )
    .toLowerCase();


    return{

        id:
        "history-"
        +
        safeMarketId
        +
        "-"
        +
        dateText
        .replace(
            /\D/g,
            ""
        ),

        market:
        normalizedMarket,

        date:
        dateText,

        openPanel:
        open,

        openSingle:
        openSingle,

        jodi:
        pair,

        closeSingle:
        closeSingle,

        closePanel:
        close,

        result:
        resultText,

        status:
        status,

        historical:
        true,

        settlementAllowed:
        false,

        source:
        cleanText(
            source
        ),

        sourceUrl:
        cleanText(
            sourceUrl
        ),

        importedAt:
        new Date()
        .toISOString()

    };

}


/* =========================================================
   FIND DATE RANGE CELL
========================================================= */

function findWeekCell(cells){

    if(
        !Array.isArray(
            cells
        )
    ){

        return null;

    }


    for(
        let index = 0;
        index < cells.length;
        index++
    ){

        const week =
        parseWeekRange(
            cells[index]
        );


        if(
            week
        ){

            return{

                index:
                index,

                week:
                week

            };

        }

    }


    return null;

}


/* =========================================================
   TRY CURRENT 8-COLUMN WEEKLY FORMAT

   DATE | MON | TUE | WED | THU | FRI | SAT | SUN
========================================================= */

function parseSevenDayCells(
    resultCells,
    week,
    options,
    output
){

    if(
        !Array.isArray(
            resultCells
        )
        ||
        resultCells.length < 1
    ){

        return 0;

    }


    let added =
    0;


    const totalDays =
    Math.min(
        7,
        resultCells.length
    );


    for(
        let dayIndex = 0;
        dayIndex < totalDays;
        dayIndex++
    ){

        const date =
        addDays(
            week.start,
            dayIndex
        );


        if(
            !inRange(
                date,
                options.fromDate,
                options.toDate
            )
        ){

            continue;

        }


        const parsed =
        parseDailyResultCell(
            resultCells[
                dayIndex
            ]
        );


        if(
            !parsed
        ){

            continue;

        }


        const record =
        createHistoricalRecord(

            options.market,

            date,

            parsed.openPanel,

            parsed.jodi,

            parsed.closePanel,

            options.source,

            options.sourceUrl

        );


        if(
            record
        ){

            output.push(
                record
            );


            added++;

        }

    }


    return added;

}


/* =========================================================
   TRY 21-CELL SPLIT FORMAT

   MON:
   OPEN | JODI | CLOSE

   x 7 days
========================================================= */

function parseTwentyOneDayCells(
    resultCells,
    week,
    options,
    output
){

    if(
        !Array.isArray(
            resultCells
        )
        ||
        resultCells.length < 3
    ){

        return 0;

    }


    let added =
    0;


    const availableDays =
    Math.min(
        7,
        Math.floor(
            resultCells.length / 3
        )
    );


    for(
        let dayIndex = 0;
        dayIndex < availableDays;
        dayIndex++
    ){

        const base =
        dayIndex * 3;


        const parsed =
        parseSplitDay(

            resultCells[
                base
            ],

            resultCells[
                base + 1
            ],

            resultCells[
                base + 2
            ]

        );


        if(
            !parsed
        ){

            continue;

        }


        const date =
        addDays(
            week.start,
            dayIndex
        );


        if(
            !inRange(
                date,
                options.fromDate,
                options.toDate
            )
        ){

            continue;

        }


        const record =
        createHistoricalRecord(

            options.market,

            date,

            parsed.openPanel,

            parsed.jodi,

            parsed.closePanel,

            options.source,

            options.sourceUrl

        );


        if(
            record
        ){

            output.push(
                record
            );


            added++;

        }

    }


    return added;

}



/* =========================================================
   MAIN HISTORICAL TABLE PARSER
   FIXED FOR BOTH SOURCE STRUCTURES

   SUPPORTED:

   PRIMARY:
   One table row = one week

   DATE | MON | TUE | WED | THU | FRI | SAT | SUN


   SECONDARY:
   Many weeks can exist inside ONE very large row

   WEEK DATE
   OPEN | JODI | CLOSE x 7
   NEXT WEEK DATE
   OPEN | JODI | CLOSE x 7
   ...

   IMPORTANT:
   Every week-range cell is scanned separately.
========================================================= */

function parseHistoricalTable(
    html,
    options
){

    options =
    options
    ||
    {};


    const market =
    cleanText(
        options.market
    );


    const source =
    cleanText(
        options.source
        ||
        "Historical Source"
    );


    const sourceUrl =
    cleanText(
        options.sourceUrl
        ||
        ""
    );


    const fromDate =
    options.fromDate
    ||
    defaultHistoryFrom();


    const toDate =
    options.toDate
    ||
    defaultHistoryTo();


    const rows =
    extractTableRows(
        html
    );


    const output =
    [];


    const parserOptions = {

        market:
        market,

        source:
        source,

        sourceUrl:
        sourceUrl,

        fromDate:
        fromDate,

        toDate:
        toDate

    };


    /* =====================================================
       PROCESS EACH HTML TABLE ROW
    ===================================================== */

    for(
        const row of rows
    ){

        if(
            !Array.isArray(
                row
            )
            ||
            row.length < 2
        ){

            continue;

        }


        /* =================================================
           FIND EVERY WEEK RANGE INSIDE THIS ROW

           Secondary source can contain hundreds of
           weeks inside one single <tr>.
        ================================================= */

        const weekPositions =
        [];


        for(
            let index = 0;
            index < row.length;
            index++
        ){

            const week =
            parseWeekRange(
                row[index]
            );


            if(
                week
            ){

                weekPositions.push({

                    index:
                    index,

                    week:
                    week

                });

            }

        }


        if(
            weekPositions.length === 0
        ){

            continue;

        }


        /* =================================================
           PROCESS EACH WEEK SEGMENT
        ================================================= */

        for(
            let weekIndex = 0;
            weekIndex < weekPositions.length;
            weekIndex++
        ){

            const current =
            weekPositions[
                weekIndex
            ];


            const week =
            current.week;


            /*
               Skip entire week if outside
               requested historical range.
            */

            if(
                startOfDay(
                    week.end
                )
                <
                startOfDay(
                    fromDate
                )
                ||
                startOfDay(
                    week.start
                )
                >
                startOfDay(
                    toDate
                )
            ){

                continue;

            }


            /*
               Current week result data starts
               immediately after date-range cell.

               It ends immediately before
               next week date-range cell.
            */

            const startIndex =
            current.index + 1;


            const endIndex =
            (
                weekIndex + 1
                <
                weekPositions.length
            )
            ?
            weekPositions[
                weekIndex + 1
            ].index
            :
            row.length;


            const resultCells =
            row.slice(
                startIndex,
                endIndex
            );


            if(
                resultCells.length === 0
            ){

                continue;

            }


            let added =
            0;


            /* =================================================
               FORMAT A:
               SPLIT OPEN | JODI | CLOSE

               Normally 21 cells:
               3 cells x 7 days

               Secondary website uses this structure.
            ================================================= */

            if(
                resultCells.length >= 18
            ){

                added =
                parseTwentyOneDayCells(

                    resultCells,

                    week,

                    parserOptions,

                    output

                );

            }


            /* =================================================
               FORMAT B:
               ONE COMBINED CELL PER DAY

               Primary DPBOSS commonly uses:
               7 cells for Monday -> Sunday.
            ================================================= */

            if(
                added === 0
            ){

                added =
                parseSevenDayCells(

                    resultCells.slice(
                        0,
                        7
                    ),

                    week,

                    parserOptions,

                    output

                );

            }


            /* =================================================
               LAST FALLBACK

               Some pages may contain a small number
               of extra cells before/after results.

               Try possible 21-cell split windows.
            ================================================= */

            if(
                added === 0
                &&
                resultCells.length > 21
            ){

                for(
                    let offset = 0;
                    offset <=
                    resultCells.length - 21;
                    offset++
                ){

                    const candidateCells =
                    resultCells.slice(
                        offset,
                        offset + 21
                    );


                    const before =
                    output.length;


                    parseTwentyOneDayCells(

                        candidateCells,

                        week,

                        parserOptions,

                        output

                    );


                    if(
                        output.length >
                        before
                    ){

                        added =
                        output.length -
                        before;


                        break;

                    }

                }

            }

        }

    }


    return output;

}




/* =========================================================
   HISTORY DEDUPE

   UNIQUE:
   MARKET + DATE

   COMPLETE > OPEN
========================================================= */

function dedupeHistory(records){

    const map =
    new Map();


    (
        Array.isArray(
            records
        )
        ?
        records
        :
        []
    )
    .forEach(
        function(record){

            if(
                !record
            ){

                return;

            }


            const key =
            normalizeMarketName(
                record.market
            )
            +
            "|"
            +
            cleanText(
                record.date
            );


            const previous =
            map.get(
                key
            );


            if(
                !previous
            ){

                map.set(
                    key,
                    record
                );


                return;

            }


            const previousComplete =
            validPanel(
                previous.closePanel
            );


            const currentComplete =
            validPanel(
                record.closePanel
            );


            if(
                !previousComplete
                &&
                currentComplete
            ){

                map.set(
                    key,
                    record
                );

            }

        }
    );


    return Array.from(
        map.values()
    );

}


/* =========================================================
   SORT HISTORY OLD -> NEW
========================================================= */

function sortHistory(records){

    records.sort(
        function(a,b){

            const dateA =
            parseDate(
                a.date
            );


            const dateB =
            parseDate(
                b.date
            );


            const timeA =
            dateA
            ?
            dateA.getTime()
            :
            0;


            const timeB =
            dateB
            ?
            dateB.getTime()
            :
            0;


            return (
                timeA
                -
                timeB
            );

        }
    );


    return records;

}


/* =========================================================
   FETCH + PARSE ONE HISTORICAL SOURCE
========================================================= */

async function fetchHistoricalSource(
    options
){

    const safeUrl =
    validateSourceUrl(
        options.url
    );


    const html =
    await fetchHtml(
        safeUrl
    );


    let records =
    parseHistoricalTable(
        html,
        {

            market:
            cleanText(
                options.market
            ),

            source:
            cleanText(
                options.source
                ||
                "Historical Source"
            ),

            sourceUrl:
            safeUrl,

            fromDate:
            options.fromDate
            ||
            defaultHistoryFrom(),

            toDate:
            options.toDate
            ||
            defaultHistoryTo()

        }
    );


    records =
    dedupeHistory(
        records
    );


    sortHistory(
        records
    );


    return{

        url:
        safeUrl,

        source:
        cleanText(
            options.source
            ||
            "Historical Source"
        ),

        market:
        cleanText(
            options.market
        ),

        htmlBytes:
        Buffer.byteLength(
            html,
            "utf8"
        ),

        tableRows:
        extractTableRows(
            html
        )
        .length,

        records:
        records

    };

}


/* =========================================================
   NORMALIZE HISTORICAL RECORD FOR COMPARISON
========================================================= */

function historicalComparableValue(record){

    if(
        !record
        ||
        typeof record !==
        "object"
    ){

        return null;

    }


    const openPanel =
    normalizePanel(
        record.openPanel
    );


    const closePanel =
    normalizePanel(
        record.closePanel
    );


    if(
        !validPanel(
            openPanel
        )
    ){

        return null;

    }


    const openSingle =
    calculateSingle(
        openPanel
    );


    let closeSingle =
    "";


    let jodi =
    normalizeJodi(
        record.jodi
    );


    if(
        validPanel(
            closePanel
        )
    ){

        closeSingle =
        calculateSingle(
            closePanel
        );


        if(
            !validJodi(
                jodi
            )
        ){

            jodi =
            openSingle
            +
            closeSingle;

        }

    }


    return{

        market:
        normalizeMarketName(
            record.market
        ),

        date:
        cleanText(
            record.date
        ),

        openPanel:
        openPanel,

        openSingle:
        openSingle,

        jodi:
        jodi,

        closeSingle:
        closeSingle,

        closePanel:
        closePanel

    };

}


/* =========================================================
   HISTORICAL RECORD MATCH
========================================================= */

function historicalRecordsMatch(
    first,
    second
){

    const a =
    historicalComparableValue(
        first
    );


    const b =
    historicalComparableValue(
        second
    );


    if(
        !a
        ||
        !b
    ){

        return false;

    }


    if(
        a.market !==
        b.market
    ){

        return false;

    }


    if(
        a.date !==
        b.date
    ){

        return false;

    }


    if(
        a.openPanel !==
        b.openPanel
    ){

        return false;

    }


    /*
       If both sources have complete result,
       Close + calculated/source Jodi must match.
    */

    if(
        validPanel(
            a.closePanel
        )
        &&
        validPanel(
            b.closePanel
        )
    ){

        return (
            a.closePanel ===
            b.closePanel
            &&
            a.jodi ===
            b.jodi
        );

    }


    /*
       One source still incomplete:
       matching Open is enough for comparison,
       but final caller can decide whether to import it.
    */

    return true;

}


/* =========================================================
   HISTORICAL MAP
========================================================= */

function createHistoricalMap(records){

    const map =
    new Map();


    dedupeHistory(
        records
    )
    .forEach(
        function(record){

            const key =
            normalizeMarketName(
                record.market
            )
            +
            "|"
            +
            cleanText(
                record.date
            );


            map.set(
                key,
                record
            );

        }
    );


    return map;

}


/* =========================================================
   VERIFY PRIMARY AGAINST SECONDARY
========================================================= */

function verifyHistoricalSources(
    primaryRecords,
    secondaryRecords
){

    const primaryMap =
    createHistoricalMap(
        primaryRecords
    );


    const secondaryMap =
    createHistoricalMap(
        secondaryRecords
    );


    const verified =
    [];


    const unmatched =
    [];


    const mismatched =
    [];


    primaryMap.forEach(
        function(
            primary,
            key
        ){

            const secondary =
            secondaryMap.get(
                key
            );


            if(
                !secondary
            ){

                unmatched.push({

                    key:
                    key,

                    primary:
                    primary

                });


                return;

            }


            if(
                !historicalRecordsMatch(
                    primary,
                    secondary
                )
            ){

                mismatched.push({

                    key:
                    key,

                    primary:
                    primary,

                    secondary:
                    secondary

                });


                return;

            }


            verified.push({

                ...primary,

                verified:
                true,

                verifiedSources:[

                    cleanText(
                        primary.source
                    ),

                    cleanText(
                        secondary.source
                    )

                ],

                historical:
                true,

                settlementAllowed:
                false

            });

        }
    );


    sortHistory(
        verified
    );


    return{

        verified:
        dedupeHistory(
            verified
        ),

        unmatched:
        unmatched,

        mismatched:
        mismatched

    };

}


/* =========================================================
   STRICT OPEN VALIDATION

   OPEN WINDOW RULE:

   Proper OPEN-only candidate = allowed.

   If Jodi or Close is already supplied during OPEN window,
   candidate is rejected completely.
========================================================= */

function validateStrictOpenResult(candidate){

    candidate =
    candidate
    ||
    {};


    const openPanel =
    normalizePanel(
        candidate.openPanel
    );


    const sourceOpenSingle =
    cleanText(
        candidate.openSingle
    );


    const sourceJodi =
    normalizeJodi(
        candidate.jodi
    );


    const sourceClosePanel =
    normalizePanel(
        candidate.closePanel
    );


    if(
        !validPanel(
            openPanel
        )
    ){

        return{

            ok:false,

            reason:
            "INVALID_OPEN_PANEL"

        };

    }


    if(
        validJodi(
            sourceJodi
        )
        ||
        validPanel(
            sourceClosePanel
        )
    ){

        return{

            ok:false,

            reason:
            "FULL_RESULT_DURING_OPEN_REJECTED"

        };

    }


    const calculatedSingle =
    calculateSingle(
        openPanel
    );


    if(
        sourceOpenSingle
        &&
        (
            !validSingle(
                sourceOpenSingle
            )
            ||
            sourceOpenSingle !==
            calculatedSingle
        )
    ){

        return{

            ok:false,

            reason:
            "OPEN_SINGLE_MISMATCH"

        };

    }


    return{

        ok:true,

        phase:
        "OPEN",

        openPanel:
        openPanel,

        openSingle:
        calculatedSingle

    };

}





/* =========================================================
   HR MATKA BACKEND
   COMPLETE REPLACEMENT
   PART 2 OF 2 - SERVER.JS

   PART 2:
   - Query helpers
   - Health API
   - Source test API
   - Historical import API
   - Dual-source verification API
   - Read-only live HTML fetch API
   - Strict OPEN validator API
   - CORS
   - Main router
   - Server start

   IMPORTANT:
   External source/history data is READ-ONLY here.
   This backend does not perform bet/wallet settlement.
========================================================= */


/* =========================================================
   QUERY PARAM HELPER
========================================================= */

function getQueryParams(requestUrl){

    const parsed =
    new URL(
        requestUrl,
        "http://127.0.0.1:" + PORT
    );


    return parsed.searchParams;

}


/* =========================================================
   PAGE TITLE HELPER
========================================================= */

function getPageTitle(html){

    const match =
    String(
        html ?? ""
    )
    .match(
        /<title\b[^>]*>([\s\S]*?)<\/title>/i
    );


    if(
        !match
    ){

        return "";

    }


    return stripTags(
        match[1]
    );

}


/* =========================================================
   CLAMP HISTORY DATE RANGE

   Minimum:
   01/01/2026

   Maximum:
   Today
========================================================= */

function getSafeHistoryRange(
    fromValue,
    toValue
){

    let fromDate =
    parseApiDate(
        fromValue
    )
    ||
    defaultHistoryFrom();


    let toDate =
    parseApiDate(
        toValue
    )
    ||
    defaultHistoryTo();


    const minimum =
    defaultHistoryFrom();


    const today =
    defaultHistoryTo();


    if(
        startOfDay(
            fromDate
        )
        <
        startOfDay(
            minimum
        )
    ){

        fromDate =
        minimum;

    }


    if(
        startOfDay(
            toDate
        )
        >
        startOfDay(
            today
        )
    ){

        toDate =
        today;

    }


    if(
        startOfDay(
            fromDate
        )
        >
        startOfDay(
            toDate
        )
    ){

        throw new Error(
            "Invalid History Date Range"
        );

    }


    return{

        fromDate:
        fromDate,

        toDate:
        toDate

    };

}


/* =========================================================
   HEALTH CHECK

   GET:
   http://127.0.0.1:5000/api/health
========================================================= */

async function handleHealth(
    req,
    res
){

    sendJson(
        res,
        200,
        {

            ok:true,

            project:
            "HR MATKA",

            backend:
            "Connected",

            version:
            "2026-history-v2",

            historicalImport:
            true,

            dualSourceVerification:
            true,

            liveProxy:
            true,

            strictOpenRule:
            true,

            settlement:
            false,

            serverTime:
            new Date()
            .toISOString()

        }
    );

}


/* =========================================================
   SOURCE TEST

   GET:
   /api/source/test?url=https://....

   Ye server-side website fetch check karega.
========================================================= */

async function handleSourceTest(
    req,
    res
){

    try{

        const params =
        getQueryParams(
            req.url
        );


        const requestedUrl =
        params.get(
            "url"
        );


        const safeUrl =
        validateSourceUrl(
            requestedUrl
        );


        const html =
        await fetchHtml(
            safeUrl
        );


        const rows =
        extractTableRows(
            html
        );


        sendJson(
            res,
            200,
            {

                ok:true,

                status:
                "Working",

                sourceUrl:
                safeUrl,

                title:
                getPageTitle(
                    html
                ),

                bytes:
                Buffer.byteLength(
                    html,
                    "utf8"
                ),

                tableRowCount:
                rows.length,

                tableRowsSample:
                rows.slice(
                    0,
                    3
                )

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:false,

                status:
                "Error",

                message:
                String(
                    error.message
                    ||
                    error
                )

            }
        );

    }

}


/* =========================================================
   SINGLE SOURCE HISTORICAL IMPORT

   POST:
   /api/history/import

   BODY:
   {
       "url":"https://...",
       "market":"SRIDEVI",
       "source":"DPBOSS",
       "from":"2026-01-01",
       "to":"2026-08-17"
   }

   READ-ONLY RECORDS RETURN.
========================================================= */

async function handleHistoryImport(
    req,
    res
){

    try{

        const body =
        await readJsonBody(
            req
        );


        const market =
        cleanText(
            body.market
        );


        if(
            !market
        ){

            throw new Error(
                "Market Required"
            );

        }


        if(
            !body.url
        ){

            throw new Error(
                "Historical Source URL Required"
            );

        }


        const range =
        getSafeHistoryRange(

            body.from,

            body.to

        );


        const result =
        await fetchHistoricalSource(
            {

                url:
                body.url,

                source:
                cleanText(
                    body.source
                    ||
                    "Historical Source"
                ),

                market:
                market,

                fromDate:
                range.fromDate,

                toDate:
                range.toDate

            }
        );


        sendJson(
            res,
            200,
            {

                ok:true,

                market:
                market,

                source:
                result.source,

                sourceUrl:
                result.url,

                from:
                formatDate(
                    range.fromDate
                ),

                to:
                formatDate(
                    range.toDate
                ),

                htmlBytes:
                result.htmlBytes,

                tableRows:
                result.tableRows,

                total:
                result.records.length,

                records:
                result.records

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:false,

                message:
                String(
                    error.message
                    ||
                    error
                ),

                total:
                0,

                records:
                []

            }
        );

    }

}


/* =========================================================
   DUAL SOURCE HISTORICAL VERIFICATION

   POST:
   /api/history/verify

   BODY:
   {
       "market":"SRIDEVI",

       "from":"2026-01-01",
       "to":"2026-08-17",

       "primary":{
           "url":"https://...",
           "source":"DPBOSS"
       },

       "secondary":{
           "url":"https://...",
           "source":"SATTA MATKA DPBOSS"
       }
   }
========================================================= */

async function handleHistoryVerify(
    req,
    res
){

    try{

        const body =
        await readJsonBody(
            req
        );


        const market =
        cleanText(
            body.market
        );


        if(
            !market
        ){

            throw new Error(
                "Market Required"
            );

        }


        if(
            !body.primary
            ||
            !body.primary.url
        ){

            throw new Error(
                "Primary Source URL Required"
            );

        }


        if(
            !body.secondary
            ||
            !body.secondary.url
        ){

            throw new Error(
                "Secondary Source URL Required"
            );

        }


        const range =
        getSafeHistoryRange(

            body.from,

            body.to

        );


        /* =========================================
           BOTH SOURCES FETCH TOGETHER
        ========================================= */

        const results =
        await Promise.all(
            [

                fetchHistoricalSource(
                    {

                        url:
                        body.primary.url,

                        source:
                        cleanText(
                            body.primary.source
                            ||
                            "DPBOSS"
                        ),

                        market:
                        market,

                        fromDate:
                        range.fromDate,

                        toDate:
                        range.toDate

                    }
                ),


                fetchHistoricalSource(
                    {

                        url:
                        body.secondary.url,

                        source:
                        cleanText(
                            body.secondary.source
                            ||
                            "SATTA MATKA DPBOSS"
                        ),

                        market:
                        market,

                        fromDate:
                        range.fromDate,

                        toDate:
                        range.toDate

                    }
                )

            ]
        );


        const primary =
        results[0];


        const secondary =
        results[1];


        const comparison =
        verifyHistoricalSources(

            primary.records,

            secondary.records

        );


        sendJson(
            res,
            200,
            {

                ok:true,

                market:
                market,

                from:
                formatDate(
                    range.fromDate
                ),

                to:
                formatDate(
                    range.toDate
                ),

                primarySource:
                primary.source,

                primaryUrl:
                primary.url,

                primaryHtmlBytes:
                primary.htmlBytes,

                primaryTableRows:
                primary.tableRows,

                primaryTotal:
                primary.records.length,


                secondarySource:
                secondary.source,

                secondaryUrl:
                secondary.url,

                secondaryHtmlBytes:
                secondary.htmlBytes,

                secondaryTableRows:
                secondary.tableRows,

                secondaryTotal:
                secondary.records.length,


                verifiedTotal:
                comparison.verified.length,

                unmatchedTotal:
                comparison.unmatched.length,

                mismatchTotal:
                comparison.mismatched.length,


                records:
                comparison.verified,

                unmatched:
                comparison.unmatched,

                mismatched:
                comparison.mismatched

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:false,

                message:
                String(
                    error.message
                    ||
                    error
                ),

                primaryTotal:
                0,

                secondaryTotal:
                0,

                verifiedTotal:
                0,

                unmatchedTotal:
                0,

                mismatchTotal:
                0,

                records:[],

                unmatched:[],

                mismatched:[]

            }
        );

    }

}


/* =========================================================
   READ-ONLY LIVE HTML FETCH

   POST:
   /api/live/fetch

   BODY:
   {
       "url":"https://...."
   }

   Ye sirf source HTML return karta hai.
========================================================= */

async function handleLiveFetch(
    req,
    res
){

    try{

        const body =
        await readJsonBody(
            req
        );


        if(
            !body.url
        ){

            throw new Error(
                "Source URL Required"
            );

        }


        const safeUrl =
        validateSourceUrl(
            body.url
        );


        const html =
        await fetchHtml(
            safeUrl
        );


        sendJson(
            res,
            200,
            {

                ok:true,

                sourceUrl:
                safeUrl,

                title:
                getPageTitle(
                    html
                ),

                bytes:
                Buffer.byteLength(
                    html,
                    "utf8"
                ),

                html:
                html

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:false,

                message:
                String(
                    error.message
                    ||
                    error
                )

            }
        );

    }

}


/* =========================================================
   STRICT OPEN VALIDATOR

   POST:
   /api/live/validate-open

   BODY:
   {
       "openPanel":"470",
       "openSingle":"1",
       "jodi":"",
       "closePanel":""
   }

   During OPEN:
   Jodi/Close present => entire candidate rejected.
========================================================= */

async function handleValidateOpen(
    req,
    res
){

    try{

        const body =
        await readJsonBody(
            req
        );


        const validation =
        validateStrictOpenResult(
            {

                openPanel:
                body.openPanel,

                openSingle:
                body.openSingle,

                jodi:
                body.jodi,

                closePanel:
                body.closePanel

            }
        );


        sendJson(
            res,
            200,
            {

                ok:
                validation.ok,

                rejected:
                !validation.ok,

                reason:
                validation.reason
                ||
                "",

                phase:
                validation.phase
                ||
                "",

                openPanel:
                validation.openPanel
                ||
                "",

                openSingle:
                validation.openSingle
                ||
                ""

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:false,

                rejected:true,

                message:
                String(
                    error.message
                    ||
                    error
                )

            }
        );

    }

}


/* =========================================================
   CORS / OPTIONS
========================================================= */

function handleOptions(
    req,
    res
){

    res.writeHead(
        204,
        {

            "Access-Control-Allow-Origin":
            "*",

            "Access-Control-Allow-Methods":
            "GET,POST,OPTIONS",

            "Access-Control-Allow-Headers":
            "Content-Type",

            "Access-Control-Max-Age":
            "86400"

        }
    );


    res.end();

}


/* =========================================================
   MAIN SERVER ROUTER
========================================================= */

const server =
http.createServer(
    async function(
        req,
        res
    ){

        try{

            /* =====================================
               CORS PRE-FLIGHT
            ===================================== */

            if(
                req.method ===
                "OPTIONS"
            ){

                handleOptions(
                    req,
                    res
                );


                return;

            }


            const parsedUrl =
            new URL(
                req.url,
                "http://127.0.0.1:" + PORT
            );


            const pathname =
            parsedUrl.pathname;


            /* =====================================
               HOME
            ===================================== */

            if(
                req.method ===
                "GET"
                &&
                pathname ===
                "/"
            ){

                sendJson(
                    res,
                    200,
                    {

                        ok:true,

                        project:
                        "HR MATKA",

                        message:
                        "Backend Running",

                        endpoints:{

                            health:
                            "/api/health",

                            sourceTest:
                            "/api/source/test",

                            historyImport:
                            "/api/history/import",

                            historyVerify:
                            "/api/history/verify",

                            liveFetch:
                            "/api/live/fetch",

                            validateOpen:
                            "/api/live/validate-open"

                        }

                    }
                );


                return;

            }


            /* =====================================
               HEALTH
            ===================================== */

            if(
                req.method ===
                "GET"
                &&
                pathname ===
                "/api/health"
            ){

                await handleHealth(
                    req,
                    res
                );


                return;

            }


            /* =====================================
               SOURCE TEST
            ===================================== */

            if(
                req.method ===
                "GET"
                &&
                pathname ===
                "/api/source/test"
            ){

                await handleSourceTest(
                    req,
                    res
                );


                return;

            }


            /* =====================================
               SINGLE SOURCE HISTORY
            ===================================== */

            if(
                req.method ===
                "POST"
                &&
                pathname ===
                "/api/history/import"
            ){

                await handleHistoryImport(
                    req,
                    res
                );


                return;

            }


            /* =====================================
               TWO SOURCE HISTORY VERIFY
            ===================================== */

            if(
                req.method ===
                "POST"
                &&
                pathname ===
                "/api/history/verify"
            ){

                await handleHistoryVerify(
                    req,
                    res
                );


                return;

            }


            /* =====================================
               LIVE HTML READ
            ===================================== */

            if(
                req.method ===
                "POST"
                &&
                pathname ===
                "/api/live/fetch"
            ){

                await handleLiveFetch(
                    req,
                    res
                );


                return;

            }


            /* =====================================
               STRICT OPEN VALIDATION
            ===================================== */

            if(
                req.method ===
                "POST"
                &&
                pathname ===
                "/api/live/validate-open"
            ){

                await handleValidateOpen(
                    req,
                    res
                );


                return;

            }


            /* =====================================
               NOT FOUND
            ===================================== */

            sendJson(
                res,
                404,
                {

                    ok:false,

                    message:
                    "API Route Not Found"

                }
            );

        }
        catch(error){

            console.error(
                "Router Error:",
                error
            );


            if(
                !res.headersSent
            ){

                sendJson(
                    res,
                    500,
                    {

                        ok:false,

                        message:
                        String(
                            error.message
                            ||
                            error
                        )

                    }
                );

            }
            else{

                try{

                    res.end();

                }
                catch(endError){

                    console.error(
                        "Response End Error:",
                        endError
                    );

                }

            }

        }

    }
);


/* =========================================================
   SERVER START
========================================================= */

server.listen(
    PORT,
    "127.0.0.1",
    function(){

        console.log(
            ""
        );


        console.log(
            "============================================"
        );


        console.log(
            "✅ HR MATKA BACKEND RUNNING"
        );


        console.log(
            "✅ Address: http://127.0.0.1:"
            +
            PORT
        );


        console.log(
            "✅ Historical Import Ready"
        );


        console.log(
            "✅ Dual Source History Verify Ready"
        );


        console.log(
            "✅ January 2026 -> Today Range Ready"
        );


        console.log(
            "✅ 2 + 4 Digit Date Parser Ready"
        );


        console.log(
            "✅ Weekly Chart Parser Ready"
        );


        console.log(
            "✅ Live Source Read Proxy Ready"
        );


        console.log(
            "✅ Strict Open Protection Ready"
        );


        console.log(
            "✅ Historical Settlement Disabled"
        );


        console.log(
            "============================================"
        );


        console.log(
            ""
        );

    }
);


/* =========================================================
   SERVER ERROR
========================================================= */

server.on(
    "error",
    function(error){

        if(
            error
            &&
            error.code ===
            "EADDRINUSE"
        ){

            console.error(
                "❌ Port "
                +
                PORT
                +
                " already in use."
            );


            console.error(
                "❌ Purana Node server pehle stop karein."
            );

        }
        else{

            console.error(
                "❌ HR MATKA Backend Error:",
                error.message
                ||
                error
            );

        }

    }
);


/* =========================================================
   UNHANDLED ERROR LOGGING
========================================================= */

process.on(
    "unhandledRejection",
    function(error){

        console.error(
            "❌ Unhandled Promise Rejection:",
            error
        );

    }
);


/* =========================================================
   SERVER.JS COMPLETE
   PART 1 + PART 2 TOGETHER = FULL FILE
========================================================= */