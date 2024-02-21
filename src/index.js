const answer = "Link is added";
const noCommandAnswer = "There is no command provided";
const notCorrectTemplate = "Please follow the template - /add name link";
const startMessage = `I can save your links for you!
Use a template like '/add name link' to insert a new link.
Retrieve all links with the '/all' command. 
Obtain the URL associated with a specific link name using the 
'/get {name}' command.
Delete a link using the '/del {name}' command.`;

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

addEventListener("scheduled", (event) => {
  event.waitUntil(scheduled());
});

async function scheduled() {
  await notifyUsers();
}

async function notifyUsers() {
  const allKeys = await LINKS.list();

  for (const key of allKeys.keys) {
    const chatId = key.name;
    const requestedLink = await LINKS.get(key.name);

    const parsedSavedLink = JSON.parse(requestedLink);

    const arr = Object.entries(parsedSavedLink);

    for (const link of arr) {
      const linkName = link[0];
      const linkUrl = link[1];

      const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=Name: ${linkName}, Url:${linkUrl}`;
      await fetch(url); // No need to parse response
    }
  }
}

async function mapAllLinks(links, chatId) {
  for (const link of Object.entries(links)) {
    const linkName = link[0];
    const linkUrl = link[1];

    const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=Name: ${linkName}, Url:${linkUrl}`;
    await fetch(url); // No need to parse response
  }
}

async function getAllLinks(chatId) {
  const links = await LINKS.get(chatId);

  if (links !== null) {
    await mapAllLinks(JSON.parse(links), chatId);
  }
}

async function addNewLink(link, chatId) {
  const key = link.trim().split(" ")[1];

  const id = chatId;
  const savedLinks = await LINKS.get(id);
  const userUrl = link.trim().split(" ")[2];

  if (savedLinks !== null) {
    const parsedSavedLinks = JSON.parse(savedLinks);

    parsedSavedLinks[key] = userUrl;
    // Store the payload in a KV namespace
    await LINKS.put(id, JSON.stringify(parsedSavedLinks));
    const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${answer}`;
    await fetch(url); // No need to parse response
  } else {
    const data = {
      [key]: userUrl,
    };

    // Store the payload in a KV namespace
    await LINKS.put(id, JSON.stringify(data));

    const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${answer}`;
    await fetch(url); // No need to parse response
  }
}

async function getLink(message, chatId) {
  const linkKey = message.trim().split(" ")[1];
  const requesterLinks = await LINKS.get(chatId);
  const parsedLinks = JSON.parse(requesterLinks);

  const link = parsedLinks[linkKey];

  const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=Name: ${linkKey}, Url:${link}`;
  await fetch(url); // No need to parse response
}

async function deleteLink(key, chatId) {
  const linkKey = key.trim().split(" ")[1];

  const requesterLinks = await LINKS.get(chatId);
  const parsedLinks = JSON.parse(requesterLinks);

  delete parsedLinks[linkKey];

  await LINKS.put(chatId, JSON.stringify(parsedLinks));

  const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text= The link ${linkKey} was deleted`;
  await fetch(url); // No need to parse response
}

async function handleWelcomeMessage(userName, chatId) {
  const message = `Hello ${userName}, ${startMessage}`;

  const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${message}`;
  await fetch(url); // No need to parse response
}

async function handleRequest(request) {
  if (request.method === "POST") {
    try {
      // Extract the JSON payload from the request body
      const { message } = await request.json();
      const isCommand = /^\//.test(message?.text);
      const chatId = message?.chat?.id;
      const userName = message?.chat?.first_name;

      if (isCommand) {
        const isPassedTemplate = message.text.trim().split(" ").length < 4;

        if (isPassedTemplate) {
          const command = message.text.trim().split(" ")[0];

          if (command === "/all") {
            await getAllLinks(chatId);

            return new Response("OK");
          } else if (command === "/start") {
            await handleWelcomeMessage(userName, chatId);

            return new Response("Ok");
          } else if (command === "/get") {
            await getLink(message.text, chatId);
            return new Response("OK");
          } else if (command === "/del") {
            await deleteLink(message.text, chatId);

            return new Response("Ok");
          } else if (command === "/add") {
            await addNewLink(message.text, chatId);

            return new Response("OK");
          }
        } else {
          const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${notCorrectTemplate}`;
          await fetch(url); // No need to parse response
        }
      } else {
        const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${noCommandAnswer}`;
        await fetch(url); // No need to parse response
      }

      // Return a success response
      return new Response("Data stored successfully!", { status: 200 });
    } catch (error) {
      console.error(error);
    }
  }

  // Return a 405 Method Not Allowed response if the request method is not POST
  return new Response("Method Not Allowed", { status: 405 });
}
