const test = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/combokit/all-customized-combokits');
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.log(e);
    }
}

test();
